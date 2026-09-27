import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../src/server/services/router";
import {
  freshUser,
  providerSession,
  type AuthContext,
} from "../../src/server/auth/provider";

const boundary = vi.hoisted(() => ({
  claims: vi.fn(),
  refresh: vi.fn(),
  database: vi.fn(),
  user: vi.fn(),
  set: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getClaims: boundary.claims,
      refreshSession: boundary.refresh,
      getUser: boundary.user,
      setSession: boundary.set,
    },
  }),
}));
vi.mock("../../src/server/db/database", () => ({
  dbAction: boundary.database,
}));

describe("AUTH-12 provider refresh outage preserves renewable browser credentials", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("APP_ORIGIN", "https://bong.example");
    vi.stubEnv("SUPABASE_URL", "https://isolated.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "isolated-test-placeholder");
    vi.spyOn(console, "info").mockImplementation(() => {});
    boundary.claims.mockResolvedValue({
      data: null,
      error: { status: 401, code: "bad_jwt" },
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const request = () =>
    handleApi(
      new Request("https://bong.example/api/session", {
        headers: {
          cookie:
            "__Host-bong-access=expired-fixture; __Host-bong-refresh=renewable-fixture",
        },
      }),
      ["session"],
    );
  it.each([
    { status: 503, code: "unexpected_failure" },
    { status: 0, name: "AuthRetryableFetchError" },
    { status: 429, code: "over_request_rate_limit" },
  ])(
    "returns503 without clearing cookies on temporary refresh error %j",
    async (error) => {
      boundary.refresh.mockResolvedValue({ data: { session: null }, error });
      const response = await request();
      expect(response.status).toBe(503);
      expect(response.headers.getSetCookie()).toEqual([]);
      const body = await response.json();
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
      expect(JSON.stringify(body)).not.toContain("renewable-fixture");
      expect(boundary.database).not.toHaveBeenCalled();
    },
  );
  it("clears revoked refresh credentials and returns401", async () => {
    boundary.refresh.mockResolvedValue({
      data: { session: null },
      error: { status: 400, code: "refresh_token_not_found" },
    });
    const response = await request();
    expect(response.status).toBe(401);
    expect(
      response.headers
        .getSetCookie()
        .filter((value) => value.includes("Max-Age=0")),
    ).toHaveLength(4);
  });
  it("preserves cookies if the SDK throws a network failure", async () => {
    boundary.refresh.mockRejectedValue(new TypeError("network fixture only"));
    const response = await request();
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
  it("does not attempt refresh or discard cookies when claims verification has a network outage", async () => {
    boundary.claims.mockResolvedValue({
      data: null,
      error: { name: "AuthRetryableFetchError", status: 0 },
    });
    const response = await request();
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(boundary.refresh).not.toHaveBeenCalled();
  });
  it("treats an explicit malformed JWT as401 even without a status", async () => {
    boundary.claims.mockResolvedValue({
      data: null,
      error: { name: "AuthInvalidJwtError" },
    });
    const response = await handleApi(
      new Request("https://bong.example/api/session", {
        headers: { cookie: "__Host-bong-access=malformed-fixture" },
      }),
      ["session"],
    );
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toHaveLength(4);
  });
  it("classifies current-user and setSession transport failures as503", async () => {
    const context = {
      actor: { userId: "fixture-user" },
      accessToken: "access-fixture",
      refreshToken: "refresh-fixture",
      client: { auth: { getUser: boundary.user, setSession: boundary.set } },
    } as unknown as AuthContext;
    boundary.user.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthRetryableFetchError", status: 0 },
    });
    boundary.set.mockResolvedValue({
      data: { session: null },
      error: { status: 502 },
    });
    await expect(freshUser(context)).rejects.toMatchObject({ status: 503 });
    await expect(providerSession(context)).rejects.toMatchObject({
      status: 503,
    });
  });
});
