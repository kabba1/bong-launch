import "server-only";
import { dbMaintenanceAction } from "../db/database";
import { removePrivate, storePrivate } from "../media/storage";
import { deleteProviderIdentity } from "../auth/administration";
import { recordJobFailure } from "../observability/events";
import { processJob, type AccountJob, type JobEffects } from "./job-runner";

export async function runMaintenance(requestId: string) {
  const deadline = Date.now() + 40_000;
  await dbMaintenanceAction("retention.run", {});
  const claimed = await dbMaintenanceAction<{
    jobs: AccountJob[];
    objects: {
      id: string;
      bucket: "media" | "exports";
      key: string;
      attempts: number;
      generation: number;
    }[];
  }>("jobs.claim", { limit: 2 });
  let completed = 0;
  let retried = 0;
  for (const object of claimed.objects) {
    if (Date.now() > deadline) break;
    try {
      if (!["media", "exports"].includes(object.bucket))
        throw new Error("INVALID_BUCKET");
      await removePrivate(object.bucket, [object.key]);
      await dbMaintenanceAction("objects.complete", {
        id: object.id,
        generation: object.generation,
      });
      completed++;
    } catch {
      await dbMaintenanceAction("objects.retry", {
        id: object.id,
        generation: object.generation,
        errorCode: "STORAGE_FAILURE",
      });
      recordJobFailure(requestId, "object_delete");
      retried++;
    }
  }
  const effects: JobEffects = {
    exportData: (id) => dbMaintenanceAction("jobs.export-data", { id }),
    storeExport: async (key, bytes) => {
      // Deterministic private object; deleting a prior incomplete attempt makes retry idempotent.
      await removePrivate("exports", [key]);
      await storePrivate("exports", key, bytes);
    },
    completeExport: async (id, exportKey) => {
      const result = await dbMaintenanceAction<{ status: string }>(
        "jobs.complete",
        { id, exportKey },
      );
      if (result.status !== "complete") throw new Error("EXPORT_CANCELLED");
    },
    prepareDeletion: (id) => dbMaintenanceAction("deletion.prepare", { id }),
    deleteIdentity: deleteProviderIdentity,
    completeDeletion: async (id) => {
      await dbMaintenanceAction("deletion.complete", { id });
    },
    retry: async (id, errorCode) => {
      await dbMaintenanceAction("jobs.retry", { id, errorCode });
      recordJobFailure(requestId, "account_job");
    },
  };
  for (const job of claimed.jobs) {
    if (Date.now() > deadline) break;
    const result = await processJob(job, effects);
    if (result === "completed") completed++;
    else retried++;
  }
  return { completed, retried };
}
