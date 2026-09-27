import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Actor } from "../db/database";
import { dbAction } from "../db/database";
import { readBytes } from "../security/boundary";
import { ApiError, unauthorized } from "../security/errors";
import { verifyChallenge } from "../security/challenge";
import { limit, pseudonym } from "../security/rate-limit";
import { sanitizeRaster } from "./sanitize";
import { storePrivate } from "./storage";

export async function uploadImage(request: Request, actor: Actor) {
  if (!actor.userId) throw unauthorized();
  if (
    !/^multipart\/form-data;\s*boundary=/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA",
      "Send a single image using the upload form.",
    );
  const bytes = await readBytes(request, 4 * 1024 * 1024);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(bytes), {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new ApiError(400, "INVALID_UPLOAD", "The upload form is incomplete.");
  }
  const entries = [...form.entries()];
  if (
    entries.some(([key]) => !["file", "captchaToken"].includes(key)) ||
    form.getAll("file").length !== 1 ||
    form.getAll("captchaToken").length !== 1
  )
    throw new ApiError(
      400,
      "INVALID_UPLOAD",
      "Upload one image at a time with its security check.",
    );
  const file = form.get("file");
  const token = form.get("captchaToken");
  if (!(file instanceof File) || typeof token !== "string" || file.size === 0)
    throw new ApiError(400, "INVALID_UPLOAD", "Choose one image.");
  if (file.size > 3 * 1024 * 1024)
    throw new ApiError(
      413,
      "IMAGE_TOO_LARGE",
      "Choose an image smaller than 3 MiB.",
    );
  const subject = pseudonym("user", actor.userId);
  await limit(actor, subject, "uploads-short", 6, 600);
  await limit(actor, subject, "uploads-day", 20, 86400);
  await limit(
    actor,
    subject,
    "upload-bytes",
    50 * 1024 * 1024,
    86400,
    file.size,
  );
  await verifyChallenge(token, "upload");
  const sanitized = await sanitizeRaster(
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  const id = randomUUID();
  // Private compensation authority survives session revocation during upload.
  // SQL binds its hash to these server-derived keys; it is never returned.
  const cleanupToken = randomBytes(32).toString("base64url");
  const mainKey = `${actor.userId}/${id}/main.webp`;
  const thumbKey = `${actor.userId}/${id}/thumb.webp`;
  await dbAction(actor, "media.reserve", {
    id,
    mainKey,
    thumbKey,
    cleanupToken,
  });
  try {
    await storePrivate("media", mainKey, sanitized.main);
    await storePrivate("media", thumbKey, sanitized.thumb);
    await dbAction(actor, "media.register", {
      id,
      mainKey,
      thumbKey,
      width: sanitized.width,
      height: sanitized.height,
      mainBytes: sanitized.main.length,
      thumbBytes: sanitized.thumb.length,
      digest: sanitized.digest,
      mime: sanitized.mime,
    });
  } catch (error) {
    // The reserved record remains durable even if abort/queue is temporarily unavailable.
    try {
      await dbAction(actor, "media.abort", { id, cleanupToken });
    } catch {
      /* The retention sweep also reclaims processing reservations. */
    }
    throw error;
  }
  return {
    id,
    width: sanitized.width,
    height: sanitized.height,
    state: "unattached",
    previewUrl: `/api/media/${id}/main`,
  };
}
