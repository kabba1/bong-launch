import "server-only";
import { createClient } from "@supabase/supabase-js";
import { providerConfig, required } from "../config/env";
import { unavailable } from "../security/errors";

function storageClient() {
  const c = providerConfig();
  return createClient(c.url, required("SUPABASE_STORAGE_SERVICE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        }),
    },
  });
}
function bucket(kind: "media" | "exports") {
  return required(
    kind === "media" ? "SUPABASE_MEDIA_BUCKET" : "SUPABASE_EXPORT_BUCKET",
  );
}
export async function verifyPrivateBuckets() {
  const client = storageClient();
  for (const kind of ["media", "exports"] as const) {
    const result = await client.storage.getBucket(bucket(kind));
    if (result.error || result.data.public) throw unavailable();
  }
}
function validateKey(key: string, kind: "media" | "exports") {
  const pattern =
    kind === "media"
      ? /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(main|thumb)\.webp$/
      : /^[0-9a-f-]{36}\/export\.json$/;
  if (!pattern.test(key)) throw unavailable();
}
export async function storePrivate(
  kind: "media" | "exports",
  key: string,
  bytes: Buffer,
) {
  validateKey(key, kind);
  const client = storageClient();
  // Deployment checks must prove the configured bucket is private; fail closed if someone changes it.
  const details = await client.storage.getBucket(bucket(kind));
  if (details.error || details.data.public) throw unavailable();
  const result = await client.storage.from(bucket(kind)).upload(key, bytes, {
    contentType: kind === "media" ? "image/webp" : "application/json",
    cacheControl: "0",
    upsert: false,
  });
  if (result.error) throw unavailable();
}
export async function removePrivate(kind: "media" | "exports", keys: string[]) {
  if (keys.length === 0) return;
  if (keys.length > 100) throw unavailable();
  for (const key of keys) validateKey(key, kind);
  const result = await storageClient().storage.from(bucket(kind)).remove(keys);
  if (result.error) throw unavailable();
}
export async function signedPrivate(kind: "media" | "exports", key: string) {
  validateKey(key, kind);
  const client = storageClient();
  const details = await client.storage.getBucket(bucket(kind));
  if (details.error || details.data.public) throw unavailable();
  const result = await client.storage
    .from(bucket(kind))
    .createSignedUrl(
      key,
      60,
      kind === "exports" ? { download: "bong-account-export.json" } : undefined,
    );
  if (result.error || !result.data?.signedUrl) throw unavailable();
  const url = new URL(result.data.signedUrl);
  if (url.origin !== providerConfig().url) throw unavailable();
  return url.toString();
}
