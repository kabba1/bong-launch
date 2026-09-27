import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/images", { recursive: true });
for (const size of [480, 800, 1254])
  await sharp("assets/bong-logo.png")
    .resize(size, size, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`public/images/bong-${size}.webp`);
console.log(
  "Optimized supplied artwork at 480, 800 and 1254px without changing composition.",
);
