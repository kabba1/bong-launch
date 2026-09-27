import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "../../src/server/media/service";
import { runMaintenance } from "../../src/server/services/maintenance";

const effects = vi.hoisted(() => ({
  database: vi.fn(),
  maintenance: vi.fn(),
  store: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../../src/server/db/database", () => ({
  dbAction: effects.database,
  dbMaintenanceAction: effects.maintenance,
}));
vi.mock("../../src/server/media/storage", () => ({
  storePrivate: effects.store,
  removePrivate: effects.remove,
}));
vi.mock("../../src/server/security/challenge", () => ({
  verifyChallenge: async () => {},
}));
vi.mock("../../src/server/security/rate-limit", () => ({
  limit: async () => {},
  pseudonym: () => "isolated-subject",
}));
vi.mock("../../src/server/auth/administration", () => ({
  deleteProviderIdentity: async () => {},
}));
vi.mock("../../src/server/observability/events", () => ({
  recordJobFailure: () => {},
}));

describe("MEDIA-12/PRIV-06 upload compensation and cleanup generation wiring", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    effects.store.mockResolvedValue(undefined);
    effects.remove.mockResolvedValue(undefined);
  });
  it("sends one private cleanup capability through reserve and late abort after session revocation", async () => {
    const actor = {
      userId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      aal: "aal1" as const,
      requestId: "test",
    };
    effects.database.mockImplementation(async (_actor, action) => {
      if (action === "media.register") throw new Error("UNAUTHENTICATED");
      return {};
    });
    const png = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "orange" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(png)], "ignored.png", { type: "image/png" }),
    );
    form.set("captchaToken", "isolated-challenge");
    await expect(
      uploadImage(
        new Request("https://bong.example/api/uploads", {
          method: "POST",
          body: form,
        }),
        actor,
      ),
    ).rejects.toThrow("UNAUTHENTICATED");
    const reserve = effects.database.mock.calls.find(
      (call) => call[1] === "media.reserve",
    )![2];
    const abort = effects.database.mock.calls.find(
      (call) => call[1] === "media.abort",
    )![2];
    expect(reserve.cleanupToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(abort).toEqual({
      id: reserve.id,
      cleanupToken: reserve.cleanupToken,
    });
    expect(effects.store).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])(
    "forwards claimed cleanup generation on completion/retry (failure=%s)",
    async (failure) => {
      const object = {
        id: "object-id",
        bucket: "media",
        key: "fixed-key",
        generation: 7,
        attempts: 1,
      };
      effects.maintenance.mockImplementation(async (action) =>
        action === "jobs.claim" ? { jobs: [], objects: [object] } : {},
      );
      if (failure) effects.remove.mockRejectedValue(new Error("provider down"));
      await runMaintenance("request");
      expect(effects.maintenance).toHaveBeenCalledWith(
        failure ? "objects.retry" : "objects.complete",
        {
          id: object.id,
          generation: 7,
          ...(failure ? { errorCode: "STORAGE_FAILURE" } : {}),
        },
      );
    },
  );
});
