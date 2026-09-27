import "server-only";
import { timingSafeEqual } from "node:crypto";
import { secret } from "../config/env";
import { forbidden } from "./errors";
export function authorizeInternal(request: Request) {
  if (request.headers.has("origin") || request.headers.has("cookie"))
    throw forbidden();
  const expected = Buffer.from(`Bearer ${secret("MAINTENANCE_TOKEN")}`);
  const provided = Buffer.from(request.headers.get("authorization") || "");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    throw forbidden();
}
