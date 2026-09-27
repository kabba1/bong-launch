import { ApiError, forbidden } from "./errors";
import type { ZodType } from "zod";

export function assertBrowserMutation(
  request: Request,
  origins: readonly string[],
) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin === "null" ||
    !origins.includes(origin) ||
    request.headers.get("x-bong-request") !== "1"
  )
    throw forbidden(
      "This request did not come from this site. Reload and try again.",
    );
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site))
    throw forbidden("Cross-site changes are not permitted.");
}

export async function readBytes(
  request: Request,
  cap: number,
): Promise<Buffer> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > cap))
    throw new ApiError(
      413,
      "BODY_TOO_LARGE",
      "The submitted data is too large.",
    );
  if (
    request.headers.get("content-encoding") &&
    request.headers.get("content-encoding") !== "identity"
  )
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA",
      "Compressed request bodies are not supported.",
    );
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    void reader.cancel("body timeout");
  }, 10_000);
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > cap) {
        await reader.cancel();
        throw new ApiError(
          413,
          "BODY_TOO_LARGE",
          "The submitted data is too large.",
        );
      }
      chunks.push(chunk.value);
    }
    if (timedOut)
      throw new ApiError(
        408,
        "BODY_TIMEOUT",
        "The request took too long. Please try again.",
      );
    if (declared && size !== Number(declared))
      throw new ApiError(
        400,
        "INVALID_BODY",
        "The request body was incomplete.",
      );
    return Buffer.concat(chunks, size);
  } finally {
    clearTimeout(deadline);
    reader.releaseLock();
  }
}

export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
  cap = 32_768,
): Promise<T> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new ApiError(415, "UNSUPPORTED_MEDIA", "Send JSON for this request.");
  const bytes = await readBytes(request, cap);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request is not valid JSON.");
  }
  return parseInput(schema, value);
}

export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues)
      fields[issue.path.join(".") || "form"] = issue.message;
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      fields,
    );
  }
  return result.data;
}

export function safeReturnTo(value: unknown, origin: string): string {
  if (
    typeof value !== "string" ||
    value.length > 1024 ||
    /[\\\u0000-\u0020\u007f]/.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /%25|%2f|%5c|%0[0-9a-f]|%1[0-9a-f]|%7f/i.test(value)
  )
    return "/account";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password)
      return "/account";
    if (
      [
        "/account",
        "/account/security",
        "/account/data",
        "/board",
        "/onboarding",
      ].includes(url.pathname)
    )
      return url.pathname;
    if (/^\/board\/[0-9a-f-]{36}$/i.test(url.pathname)) return url.pathname;
    if (url.pathname === "/board/new") {
      const id = url.searchParams.get("sourceIdeaId");
      return id && /^BONG-\d{4}$/.test(id)
        ? `/board/new?sourceIdeaId=${id}`
        : "/board/new";
    }
  } catch {
    /* Fixed fallback. */
  }
  return "/account";
}
