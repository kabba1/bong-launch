import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { dbAction, type Actor } from "../db/database";
import { appConfig, secret } from "../config/env";
import { ApiError, unavailable } from "./errors";

export function pseudonym(kind: string, value: string) {
  return createHmac("sha256", secret("RATE_LIMIT_SECRET"))
    .update(`${kind}\0${value}`)
    .digest("hex");
}
export function trustedIp(request: Request) {
  if (appConfig().environment === "local") return "local-loopback";
  // Vercel overwrites this deployment-owned header. Never fall back to caller X-Forwarded-For.
  if (process.env.VERCEL !== "1") throw unavailable();
  const value = request.headers.get("x-vercel-forwarded-for");
  if (!value || !isIP(value.trim())) throw unavailable();
  return value.trim();
}
export async function limit(
  actor: Actor,
  subjectKey: string,
  action: string,
  ceiling: number,
  seconds: number,
  cost = 1,
) {
  const result = await dbAction<{ allowed?: boolean; retryAfter?: number }>(
    actor,
    "limit.consume",
    { subjectKey, action, limit: ceiling, windowSeconds: seconds, cost },
  );
  if (result.allowed === false)
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please try again later.",
      undefined,
      result.retryAfter || seconds,
    );
  if (result.allowed !== true) throw unavailable();
}
export async function ipLimit(
  request: Request,
  actor: Actor,
  action: string,
  ceiling: number,
  seconds: number,
) {
  return limit(
    actor,
    pseudonym("ip", trustedIp(request)),
    action,
    ceiling,
    seconds,
  );
}
