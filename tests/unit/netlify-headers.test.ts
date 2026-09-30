import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNetlifyHeaders } from "../../scripts/netlify-headers";

afterEach(() => vi.unstubAllEnvs());

describe("Netlify static asset header generation (SEC-07/08/16, OPS-05)", () => {
  it.each(["staging", "production"])(
    "writes %s asset headers while preserving public HTML and framework cache defaults",
    async (environment) => {
      vi.stubEnv("APP_ENV", environment);
      vi.stubEnv("NODE_ENV", "production");
      const root = mkdtempSync(join(tmpdir(), "bong-netlify-headers-test-"));
      try {
        mkdirSync(join(root, "public"));
        await buildNetlifyHeaders(root);
        const file = join(root, "public/_headers");
        expect(existsSync(file)).toBe(true);
        const first = readFileSync(file, "utf8");
        await buildNetlifyHeaders(root);
        expect(readFileSync(file, "utf8")).toBe(first);
        const blocks = first.trim().split(/\n\n/);
        const rules = new Map(
          blocks.map((block) => {
            const [path, ...lines] = block.split("\n");
            return [
              path!,
              Object.fromEntries(
                lines.map((line) => {
                  const colon = line.indexOf(":");
                  return [
                    line.slice(0, colon).trim(),
                    line.slice(colon + 1).trim(),
                  ];
                }),
              ),
            ] as const;
          }),
        );
        const global = rules.get("/*")!;
        expect(global["X-Frame-Options"]).toBe("DENY");
        expect(global["X-Content-Type-Options"]).toBe("nosniff");
        expect(global["Referrer-Policy"]).toBe(
          "strict-origin-when-cross-origin",
        );
        expect(global["Permissions-Policy"]).toBe(
          "camera=(), microphone=(), geolocation=(), payment=()",
        );
        expect(global["Content-Security-Policy"]).toContain(
          "frame-ancestors 'none'",
        );
        expect(global["Content-Security-Policy"]).not.toMatch(
          /nonce-|unsafe-eval|https?:|\*/,
        );
        expect(global["Cache-Control"]).toBeUndefined();
        expect(global["X-Robots-Tag"]).toBe(
          environment === "production" ? undefined : "noindex, nofollow",
        );
        expect(global["Strict-Transport-Security"]).toBe(
          environment === "production" ? "max-age=31536000" : undefined,
        );
        expect(rules.get("/data/*")?.["Cache-Control"]).toBe(
          "public, max-age=31536000, immutable",
        );
        expect(rules.get("/data/manifest.json")?.["Cache-Control"]).toBe(
          "no-cache",
        );
        expect(rules.get("/images/*")?.["Cache-Control"]).toBe(
          "public, max-age=31536000, immutable",
        );
        expect(rules.has("/_next/static/*")).toBe(false);
        expect(first).not.toContain(":path*");
      } finally {
        const within = relative(tmpdir(), root);
        if (!within || within.startsWith("..") || isAbsolute(within))
          throw new Error("Unsafe Netlify header fixture cleanup path.");
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
