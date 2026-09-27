import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/server/security/errors";
import { readPageData } from "../../src/server/services/page-read";

const boundary = vi.hoisted(() => ({
  auth: vi.fn(),
  database: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("../../src/server/auth/provider", () => ({ loadAuth: boundary.auth }));
vi.mock("../../src/server/db/database", () => ({
  dbAction: boundary.database,
}));
vi.mock("../../src/server/security/rate-limit", () => ({
  ipLimit: boundary.limit,
}));
vi.mock("../../src/server/config/env", () => ({
  appConfig: () => ({ secureCookies: false }),
}));
const request = (cookies = false) =>
  new Request("http://localhost/board/test", {
    headers: cookies
      ? {
          cookie:
            "bong-access=expired-test-value; bong-refresh=opaque-test-value",
        }
      : {},
  });
const anonymous = {
  actor: { userId: null, sessionId: null, aal: "aal1", requestId: "test" },
};

describe("AUTH-06 BOARD-03 private page session recovery adapter", () => {
  beforeEach(() => {
    vi.stubEnv("COMMUNITY_ENABLED", "true");
    vi.resetAllMocks();
    boundary.limit.mockResolvedValue(undefined);
    boundary.database.mockRejectedValue(new Error("NOT_FOUND"));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("keeps genuine anonymous unknown posts as not-found", async () => {
    boundary.auth.mockResolvedValue(anonymous);
    await expect(
      readPageData(request(), "post.get", { id: "unknown" }),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("offers generic recovery after failed credentials and an anonymous miss, without refreshing in RSC", async () => {
    boundary.auth.mockRejectedValue(
      new ApiError(401, "AUTH_REQUIRED", "Expired"),
    );
    await expect(
      readPageData(request(true), "post.get", { id: "private-or-unknown" }),
    ).rejects.toMatchObject({ code: "SESSION_RECOVERY_REQUIRED" });
    expect(boundary.auth.mock.calls[0][2]).toEqual({ refresh: false });
    expect(boundary.auth.mock.calls[0][0].headers()).toEqual([]);
    expect(boundary.database.mock.calls[0][0]).toMatchObject({
      userId: null,
      sessionId: null,
    });
  });
  it("retains ordinary public reads and does not turn backend failures into auth recovery", async () => {
    boundary.auth.mockRejectedValue(
      new ApiError(401, "AUTH_REQUIRED", "Expired"),
    );
    boundary.database.mockResolvedValueOnce({
      id: "public",
      state: "published",
    });
    await expect(
      readPageData(request(true), "post.get", { id: "public" }),
    ).resolves.toEqual({ id: "public", state: "published" });
    boundary.database.mockRejectedValueOnce(new Error("SERVICE_UNAVAILABLE"));
    await expect(
      readPageData(request(true), "post.get", { id: "anything" }),
    ).rejects.toThrow("SERVICE_UNAVAILABLE");
    boundary.auth.mockRejectedValueOnce(
      new ApiError(503, "SERVICE_UNAVAILABLE", "Provider down"),
    );
    await expect(
      readPageData(request(true), "post.get", { id: "anything" }),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("never offers the recovery hint without credentials or for unknown public profiles", async () => {
    boundary.auth.mockRejectedValue(
      new ApiError(401, "AUTH_REQUIRED", "Expired"),
    );
    await expect(
      readPageData(request(), "post.get", { id: "unknown" }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      readPageData(request(true), "member.get", { handle: "unknown" }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
