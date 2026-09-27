import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../src/server/services/router";
import * as provider from "../../src/server/auth/provider";
import * as database from "../../src/server/db/database";
import { randomUUID } from "node:crypto";

describe("SEC-01/04/07/17 BFF request boundary and fail-closed outages", () => {
  beforeEach(() => {
    vi.stubEnv("COMMUNITY_ENABLED", "true");
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("APP_ORIGIN", "https://bong.example");
    vi.stubEnv("CSRF_SECRET", "isolated-csrf-test-material-".repeat(3));
    vi.stubEnv("RATE_LIMIT_SECRET", "isolated-rate-test-material-".repeat(3));
    vi.stubEnv("BONG_DATABASE_URL", "");
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  async function formHeaders() {
    const issued = await handleApi(
      new Request("https://bong.example/api/security/csrf"),
      ["security", "csrf"],
    );
    expect(issued.status).toBe(200);
    const token = (await issued.json()).data.token;
    return {
      origin: "https://bong.example",
      "content-type": "application/json",
      "x-bong-request": "1",
      "x-csrf-token": token,
      cookie: issued.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; "),
    };
  }
  it("keeps liveness and anonymous session state independent of backend configuration", async () => {
    const live = await handleApi(
      new Request("https://bong.example/api/health/live"),
      ["health", "live"],
    );
    expect(live.status).toBe(200);
    expect((await live.json()).data.live).toBe(true);
    const session = await handleApi(
      new Request("https://bong.example/api/session"),
      ["session"],
    );
    expect(session.status).toBe(200);
    expect((await session.json()).data.user).toBeNull();
    expect(session.headers.get("cache-control")).toContain("no-store");
  });
  it("blocks cross-site writes and does not offer permissive CORS", async () => {
    const request = new Request("https://bong.example/api/auth/request-code", {
      method: "POST",
      headers: {
        origin: "https://evil.test",
        "x-bong-request": "1",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect((await handleApi(request, ["auth", "request-code"])).status).toBe(
      403,
    );
    const options = await handleApi(
      new Request("https://bong.example/api/auth/request-code", {
        method: "OPTIONS",
      }),
      ["auth", "request-code"],
    );
    expect(options.status).toBe(405);
    expect(options.headers.has("access-control-allow-origin")).toBe(false);
  });
  it("rejects mass assignment before any provider call and keeps request values out of logs", async () => {
    const headers = await formHeaders();
    const email = "private-test@example.org";
    const response = await handleApi(
      new Request("https://bong.example/api/auth/request-code", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          captchaToken: "never-log-this",
          role: "admin",
        }),
      }),
      ["auth", "request-code"],
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
      email,
    );
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
      "never-log-this",
    );
  });
  it("reports limiter/backend outage as 503 without claiming that email was sent", async () => {
    const headers = await formHeaders();
    const response = await handleApi(
      new Request("https://bong.example/api/auth/request-code", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: "member@example.org",
          captchaToken: "test-only-token",
        }),
      }),
      ["auth", "request-code"],
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.data).toBeUndefined();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("denies unauthenticated account, staff and media mutations", async () => {
    for (const path of [
      ["account", "content"],
      ["moderation", "queue"],
      ["admin", "audit"],
    ])
      expect(
        (
          await handleApi(
            new Request(`https://bong.example/api/${path.join("/")}`),
            path,
          )
        ).status,
      ).toBe(401);
    const headers = await formHeaders();
    expect(
      (
        await handleApi(
          new Request("https://bong.example/api/uploads", {
            method: "POST",
            headers,
            body: "{}",
          }),
          ["uploads"],
        )
      ).status,
    ).toBe(401);
  });
  it("rejects actual oversized bytes with no Content-Length", async () => {
    const headers = await formHeaders();
    const response = await handleApi(
      new Request("https://bong.example/api/auth/verify-code", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "x".repeat(33_000) }),
      }),
      ["auth", "verify-code"],
    );
    expect(response.status).toBe(413);
  });
  it.each(["POST", "PATCH"])(
    "rejects %s image references when the server upload switch is off, while permitting empty assets",
    async (method) => {
      vi.stubEnv("POSTING_ENABLED", "true");
      vi.stubEnv("UPLOADS_ENABLED", "false");
      const userId = randomUUID(),
        sessionId = randomUUID();
      vi.spyOn(provider, "loadAuth").mockResolvedValue({
        actor: { userId, sessionId, aal: "aal1", requestId: randomUUID() },
        state: {
          userId,
          sessionId,
          onboarded: true,
          member: {
            handle: "test_member",
            displayName: "Test",
            bio: "",
            version: 1,
            state: "active",
            trustedText: false,
          },
          staffRole: null,
          approvedFactorIds: [],
        },
        client: null,
        accessToken: null,
        refreshToken: null,
      });
      const call = vi
        .spyOn(database, "dbAction")
        .mockResolvedValue({ id: randomUUID() });
      const headers = await formHeaders();
      const path =
        method === "POST"
          ? ["board", "posts"]
          : ["board", "posts", randomUUID()];
      const payload = {
        title: "A real contribution",
        body: "A sufficiently long contribution body.",
        ...(method === "POST"
          ? { kind: "hear_me_out", idempotencyKey: randomUUID() }
          : { expectedVersion: 1 }),
      };
      const send = (assets: unknown[]) =>
        handleApi(
          new Request(`https://bong.example/api/${path.join("/")}`, {
            method,
            headers,
            body: JSON.stringify({ ...payload, assets }),
          }),
          path,
        );
      const denied = await send([
        { id: randomUUID(), altText: "Previously sanitized private image" },
      ]);
      expect(denied.status).toBe(503);
      expect((await denied.json()).error.code).toBe("UPLOADS_DISABLED");
      expect(call).not.toHaveBeenCalled();
      expect((await send([])).status).toBe(method === "POST" ? 201 : 200);
      expect(call).toHaveBeenCalledOnce();
    },
  );
});
