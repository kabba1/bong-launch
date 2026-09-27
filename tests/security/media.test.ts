import sharp from "sharp";
import { describe, it, expect } from "vitest";
import { sanitizeRaster } from "../../src/server/media/sanitize";

describe("MEDIA-01/02/03/04/05/06 raster boundary", () => {
  it("reencodes actual pixels to canonical variants and removes source metadata/trailing payload", async () => {
    const source = await sharp({
      create: { width: 900, height: 450, channels: 3, background: "#f06525" },
    })
      .withMetadata({ exif: { IFD0: { Copyright: "private-source-marker" } } })
      .png()
      .toBuffer();
    const image = await sanitizeRaster(
      Buffer.concat([source, Buffer.from("<script>attack</script>")]),
      "image/png",
    );
    expect(image.width).toBe(900);
    expect(image.height).toBe(450);
    for (const derivative of [image.main, image.thumb]) {
      const meta = await sharp(derivative).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
      expect(derivative.includes(Buffer.from("private-source-marker"))).toBe(
        false,
      );
      expect(derivative.includes(Buffer.from("<script>"))).toBe(false);
    }
    expect((await sharp(image.thumb).metadata()).width).toBe(640);
  });
  it("rejects unsupported bytes and MIME-spoofed real raster", async () => {
    for (const bytes of [
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      Buffer.from("GIF89a"),
      Buffer.from("%PDF"),
      Buffer.from("<html>"),
    ])
      await expect(sanitizeRaster(bytes, "image/png")).rejects.toMatchObject({
        status: 415,
      });
    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(sanitizeRaster(png, "image/jpeg")).rejects.toMatchObject({
      status: 415,
    });
    await expect(
      sanitizeRaster(Buffer.alloc(3 * 1024 * 1024 + 1), "image/png"),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("rejects excessive decoded dimensions without accepting small compressed size", async () => {
    const wide = await sharp({
      create: { width: 8001, height: 1, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(sanitizeRaster(wide, "image/png")).rejects.toMatchObject({
      status: 413,
    });
  });
});
