export type AccountJob = {
  id: string;
  userId: string;
  kind: "export" | "deletion";
  phase: string;
  attempts: number;
};
export type JobEffects = {
  exportData: (id: string) => Promise<unknown>;
  storeExport: (key: string, bytes: Buffer) => Promise<void>;
  completeExport: (id: string, key: string) => Promise<void>;
  prepareDeletion: (
    id: string,
  ) => Promise<{ userId: string; readyForProviderDeletion: boolean }>;
  deleteIdentity: (userId: string) => Promise<void>;
  completeDeletion: (id: string) => Promise<void>;
  retry: (id: string, code: string) => Promise<void>;
};

export async function processJob(
  job: AccountJob,
  effects: JobEffects,
): Promise<"completed" | "retry"> {
  try {
    if (job.kind === "export") {
      const data = await effects.exportData(job.id);
      const bytes = Buffer.from(JSON.stringify(data));
      if (bytes.length > 32 * 1024 * 1024) throw new Error("EXPORT_LIMIT");
      const key = `${job.id}/export.json`;
      await effects.storeExport(key, bytes);
      await effects.completeExport(job.id, key);
    } else {
      const ready = await effects.prepareDeletion(job.id);
      if (!ready.readyForProviderDeletion) {
        await effects.retry(job.id, "MEDIA_PENDING");
        return "retry";
      }
      if (ready.userId !== job.userId) throw new Error("IDENTITY_MISMATCH");
      await effects.deleteIdentity(ready.userId);
      await effects.completeDeletion(job.id);
    }
    return "completed";
  } catch {
    await effects.retry(job.id, "DEPENDENCY_FAILURE");
    return "retry";
  }
}
