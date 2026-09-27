import "server-only";
import { createHmac } from "node:crypto";

type Event = {
  requestId: string;
  route: string;
  status: number;
  durationMs: number;
  code?: string;
  userId?: string | null;
};
/** Deliberately accepts no request, error, headers, body, email or signed URL object. */
export function recordRequest(event: Event) {
  const key = process.env.LOG_HMAC_SECRET;
  const actor =
    event.userId && key
      ? createHmac("sha256", key)
          .update(event.userId)
          .digest("hex")
          .slice(0, 20)
      : undefined;
  console.info(
    JSON.stringify({
      event: "api_request",
      requestId: event.requestId,
      route: event.route,
      status: event.status,
      durationMs: event.durationMs,
      code: event.code,
      actor,
    }),
  );
}
export function recordJobFailure(requestId: string, jobType: string) {
  console.error(
    JSON.stringify({
      event: "maintenance_failure",
      requestId,
      jobType,
      severity: "error",
    }),
  );
}
