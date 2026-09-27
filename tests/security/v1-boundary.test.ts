import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";
import { handleApi } from "../../src/server/services/router";
import { readPageData } from "../../src/server/services/page-read";
import * as provider from "../../src/server/auth/provider";
import * as database from "../../src/server/db/database";
import * as env from "../../src/server/config/env";

describe("V1-01/02/03 default-off community boundary", () => {
  beforeEach(() => {
    vi.stubEnv("COMMUNITY_ENABLED", "");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://bong.test");
    vi.stubEnv("REGISTRATIONS_ENABLED", "true");
    vi.stubEnv("POSTING_ENABLED", "true");
    vi.stubEnv("UPLOADS_ENABLED", "true");
    vi.stubEnv("SUPABASE_URL", "https://provider.test");
    vi.spyOn(provider, "loadAuth");
    vi.spyOn(database, "dbAction");
    vi.spyOn(env, "appConfig");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("Unexpected provider request");
      }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires an exact explicit opt-in and does not initialize backend configuration", async () => {
    for (const flag of [undefined, "", "false", "TRUE", "1", " true "]) {
      vi.stubEnv("COMMUNITY_ENABLED", flag);
      const response = await handleApi(
        new Request("https://bong.test/api/health/live"),
        ["health", "live"],
      );
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("COMMUNITY_DISABLED");
    }
    expect(env.appConfig).not.toHaveBeenCalled();
    expect(provider.loadAuth).not.toHaveBeenCalled();
    expect(database.dbAction).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks read, write, upload and job routes even with stale cookies and participation switches on", async () => {
    vi.stubEnv("APP_ORIGIN", "invalid-config-must-not-be-read");
    for (const path of [
      "session",
      "security/csrf",
      "auth/request-code",
      "board/posts",
      "account/profile",
      "moderation/queue",
      "admin/audit",
      "media/00000000-0000-4000-8000-000000000001/main",
      "uploads",
      "internal/maintenance",
      "health/ready",
    ]) {
      for (const method of [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ]) {
        const response = await handleApi(
          new Request(`https://bong.test/api/${path}?COMMUNITY_ENABLED=true`, {
            method,
            headers: {
              cookie: "bong-access=old-session",
              origin: "https://bong.test",
              "x-community-enabled": "true",
            },
          }),
          path.split("/"),
        );
        expect(response.status).toBe(404);
        expect(response.headers.get("cache-control")).toContain("no-store");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.has("set-cookie")).toBe(false);
        expect(response.headers.has("access-control-allow-origin")).toBe(false);
      }
    }
    expect(env.appConfig).not.toHaveBeenCalled();
    expect(provider.loadAuth).not.toHaveBeenCalled();
    expect(database.dbAction).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("redirects every private page family before rendering, with a fixed safe destination", () => {
    for (const path of [
      "/board",
      "/board/new",
      "/board/anything/edit",
      "/sign-in",
      "/onboarding",
      "/account/data",
      "/moderation/review/anything",
      "/admin/features",
      "/members/anyone",
      "/bo%61rd/new",
    ]) {
      const response = proxy(
        new NextRequest(`https://bong.test${path}?returnTo=https://evil.test`),
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://bong.test/community",
      );
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("strict-transport-security")).toContain(
        "max-age=",
      );
    }
  });

  it("keeps the public nonce CSP and removes unused community service origins", () => {
    const response = proxy(new NextRequest("https://bong.test/"));
    const csp = response.headers.get("content-security-policy")!;
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("challenges.cloudflare.com");
    expect(csp).not.toContain("provider.test");
  });

  it("also refuses server page reads without touching Auth or SQL", async () => {
    await expect(
      readPageData(
        new Request("https://bong.test/board/anything"),
        "post.get",
        { id: "anything" },
      ),
    ).rejects.toMatchObject({ status: 404, code: "COMMUNITY_DISABLED" });
    expect(env.appConfig).not.toHaveBeenCalled();
    expect(provider.loadAuth).not.toHaveBeenCalled();
    expect(database.dbAction).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains the preserved community handler and page routes when explicitly opted in", async () => {
    vi.stubEnv("COMMUNITY_ENABLED", "true");
    const response = await handleApi(
      new Request("https://bong.test/api/health/live"),
      ["health", "live"],
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.live).toBe(true);
    expect(
      proxy(new NextRequest("https://bong.test/account")).headers.has(
        "location",
      ),
    ).toBe(false);
  });
});
