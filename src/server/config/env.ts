import "server-only";
import { unavailable } from "../security/errors";
import { communityEnabled } from "../../lib/launch-scope";

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw unavailable();
  return value;
}
export function secret(name: string): string {
  const value = required(name);
  if (Buffer.byteLength(value) < 32) throw unavailable();
  return value;
}
export function appConfig() {
  const environment = process.env.APP_ENV || "local";
  if (
    !["local", "test", "preview", "staging", "production"].includes(environment)
  )
    throw unavailable();
  const configured =
    process.env.APP_ORIGIN ||
    (environment === "local" ? "http://127.0.0.1:3210" : undefined);
  if (!configured) throw unavailable();
  let origin: URL;
  try {
    origin = new URL(configured);
  } catch {
    throw unavailable();
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/" ||
    (origin.protocol !== "https:" &&
      !(environment === "local" && local && origin.protocol === "http:"))
  )
    throw unavailable();
  return {
    environment,
    origin: origin.origin,
    secureCookies: !(environment === "local" && local),
    registrationsEnabled:
      communityEnabled() && process.env.REGISTRATIONS_ENABLED === "true",
    postingEnabled:
      communityEnabled() && process.env.POSTING_ENABLED === "true",
    uploadsEnabled:
      communityEnabled() && process.env.UPLOADS_ENABLED === "true",
    reviewAll: process.env.REVIEW_ALL_SUBMISSIONS !== "false",
    rulesVersion: process.env.COMMUNITY_RULES_VERSION || "",
    termsVersion: process.env.TERMS_VERSION || "",
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
  };
}

export function providerConfig() {
  const url = required("SUPABASE_URL");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw unavailable();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw unavailable();
  return { url: parsed.origin, key: required("SUPABASE_PUBLISHABLE_KEY") };
}
