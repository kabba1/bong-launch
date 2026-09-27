import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { ApiError } from "../security/errors";

sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 20 });
let running = 0;
const maxBytes = 3 * 1024 * 1024;
export async function sanitizeRaster(bytes: Buffer, declaredMime: string) {
  if (bytes.length > maxBytes)
    throw new ApiError(
      413,
      "IMAGE_TOO_LARGE",
      "Choose an image smaller than 3 MiB.",
    );
  const format = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "jpeg"
      : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        ? "webp"
        : null;
  if (!format || declaredMime !== `image/${format}`)
    throw new ApiError(
      415,
      "UNSUPPORTED_IMAGE",
      "Use a JPEG, PNG, or non-animated WebP image.",
    );
  if (running >= 2)
    throw new ApiError(
      503,
      "IMAGE_BUSY",
      "Image processing is busy. Please try again.",
      undefined,
      10,
    );
  running++;
  try {
    const decoder = sharp(bytes, {
      limitInputPixels: 24_000_000,
      failOn: "warning",
      animated: false,
      sequentialRead: true,
    }).timeout({ seconds: 10 });
    const meta = await decoder.metadata();
    if (meta.format !== format || (meta.pages || 1) !== 1)
      throw new ApiError(
        415,
        "ANIMATED_IMAGE",
        "Animated or multi-page images are not supported.",
      );
    if (
      !meta.width ||
      !meta.height ||
      Math.max(meta.width, meta.height) > 8000 ||
      meta.width * meta.height > 24_000_000
    )
      throw new ApiError(
        413,
        "IMAGE_DIMENSIONS",
        "Use an image no larger than 8,000 pixels per side and 24 million pixels.",
      );
    const main = await decoder
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(main.data)
      .timeout({ seconds: 10 })
      .resize({
        width: 640,
        height: 640,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 3 })
      .toBuffer();
    if (main.data.length > maxBytes || thumb.length > maxBytes)
      throw new ApiError(
        413,
        "PROCESSED_IMAGE_TOO_LARGE",
        "This image could not be made small enough. Try a smaller image.",
      );
    return {
      main: main.data,
      thumb,
      width: main.info.width,
      height: main.info.height,
      mime: "image/webp" as const,
      digest: createHash("sha256").update(main.data).digest("hex"),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      415,
      "INVALID_IMAGE",
      "The image could not be decoded safely. Try a different image.",
    );
  } finally {
    running--;
  }
}
