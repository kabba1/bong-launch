import { describe, it, expect } from "vitest";
import {
  processJob,
  type JobEffects,
} from "../../src/server/services/job-runner";

describe("PRIV-02/03/04 durable job ordering", () => {
  function effects(events: string[], ready = true): JobEffects {
    return {
      exportData: async () => ({ profile: { handle: "member" }, media: [] }),
      storeExport: async () => {
        events.push("store-export");
      },
      completeExport: async () => {
        events.push("complete-export");
      },
      prepareDeletion: async () => {
        events.push("prepare-delete");
        return { readyForProviderDeletion: ready, userId: "account-id" };
      },
      deleteIdentity: async () => {
        events.push("delete-identity");
      },
      completeDeletion: async () => {
        events.push("complete-delete");
      },
      retry: async () => {
        events.push("retry");
      },
    };
  }
  it("never calls provider deletion until private object cleanup is confirmed", async () => {
    const events: string[] = [];
    await processJob(
      {
        id: "job",
        userId: "account-id",
        kind: "deletion",
        phase: "pending",
        attempts: 1,
      },
      effects(events, false),
    );
    expect(events).toEqual(["prepare-delete", "retry"]);
  });
  it("records completion after actual provider deletion and retries provider failures", async () => {
    const events: string[] = [];
    await processJob(
      {
        id: "job",
        userId: "account-id",
        kind: "deletion",
        phase: "pending",
        attempts: 1,
      },
      effects(events),
    );
    expect(events).toEqual([
      "prepare-delete",
      "delete-identity",
      "complete-delete",
    ]);
    const failed: string[] = [];
    const failing = effects(failed);
    failing.deleteIdentity = async () => {
      throw new Error("do not log provider details");
    };
    await processJob(
      {
        id: "job",
        userId: "account-id",
        kind: "deletion",
        phase: "pending",
        attempts: 1,
      },
      failing,
    );
    expect(failed).toEqual(["prepare-delete", "retry"]);
  });
  it("never reports a complete export when storage fails", async () => {
    const events: string[] = [];
    const failing = effects(events);
    failing.storeExport = async () => {
      events.push("failed-store");
      throw new Error("secret");
    };
    await processJob(
      {
        id: "job",
        userId: "account-id",
        kind: "export",
        phase: "pending",
        attempts: 1,
      },
      failing,
    );
    expect(events).toEqual(["failed-store", "retry"]);
  });
});
