import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { appConfig, providerConfig, secret, required } from "../config/env";
import { dbAction, type Actor } from "../db/database";
import { unavailable } from "../security/errors";
import { verifyPrivateBuckets } from "../media/storage";

export async function readiness(requestId: string) {
  appConfig();
  secret("CSRF_SECRET");
  secret("RATE_LIMIT_SECRET");
  secret("LOG_HMAC_SECRET");
  required("SUPABASE_AUTH_ADMIN_KEY");
  const provider = providerConfig();
  const manifest = JSON.parse(
    await readFile(
      join(process.cwd(), "public", "data", "manifest.json"),
      "utf8",
    ),
  ) as { hash: string; url: string };
  if (
    !/^[a-f0-9]{64}$/.test(manifest.hash) ||
    manifest.url !== `/data/ideas.${manifest.hash}.json`
  )
    throw unavailable();
  const corpus = await readFile(
    join(process.cwd(), "public", "data", `ideas.${manifest.hash}.json`),
  );
  if (createHash("sha256").update(corpus).digest("hex") !== manifest.hash)
    throw unavailable();
  const actor: Actor = {
    userId: null,
    sessionId: null,
    aal: "aal1",
    requestId,
  };
  await dbAction(actor, "health.ready", {});
  const health = await fetch(`${provider.url}/auth/v1/health`, {
    headers: { apikey: provider.key },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!health.ok) throw unavailable();
  await verifyPrivateBuckets();
  return { ready: true };
}
