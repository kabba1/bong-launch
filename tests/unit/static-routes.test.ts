import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStaticParams as ideaParams } from "../../src/app/idea/[ideaId]/page";
import { generateStaticParams as imageParams } from "../../src/app/idea/[ideaId]/opengraph-image/route";

const overrides = vi.hoisted(() => ({
  schemaVersion: 1,
  excludedIds: [] as string[],
}));
vi.mock("../../content/idea-overrides.json", () => ({ default: overrides }));
afterEach(() => {
  overrides.excludedIds = [];
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("static content routes (DATA-07/08, GEN-15)", () => {
  it("enumerates every supplied active idea for both HTML and OG generation", () => {
    const expected = Array.from({ length: 1000 }, (_, index) => ({
      ideaId: `BONG-${String(index + 1).padStart(4, "0")}`,
    }));
    expect(ideaParams()).toEqual(expected);
    expect(imageParams()).toEqual(expected);
  });

  it("rewrites only withdrawn IDs to guarded 410 tombstones without disclosing idea text", async () => {
    const root = mkdtempSync(join(tmpdir(), "bong-withdrawal-test-"));
    try {
      mkdirSync(join(root, "content/generated"), { recursive: true });
      writeFileSync(
        join(root, "content/generated/idea-lookup.json"),
        JSON.stringify({
          ideas: {
            "BONG-0002": {
              id: "BONG-0002",
              text: "Active test text",
              categoryId: "test",
            },
          },
          withdrawnIds: ["BONG-0001"],
        }),
      );
      overrides.excludedIds = ["BONG-0001"];
      vi.spyOn(process, "cwd").mockReturnValue(root);
      vi.resetModules();
      const config = (await import("../../next.config")).default;
      expect(await config.rewrites!()).toEqual({
        beforeFiles: [
          { source: "/idea/BONG-0001", destination: "/idea/BONG-0001/removed" },
        ],
        afterFiles: [],
        fallback: [],
      });
      const route = await import("../../src/app/idea/[ideaId]/removed/route");
      expect(route.generateStaticParams()).toEqual([{ ideaId: "BONG-0001" }]);
      const response = await route.GET(
        new Request("https://bong.test/idea/BONG-0001/removed"),
        { params: Promise.resolve({ ideaId: "BONG-0001" }) },
      );
      expect(response.status).toBe(410);
      expect(response.headers.get("cache-control")).toBeNull();
      const html = await response.text();
      expect(html).toContain("This idea has been withdrawn.");
      expect(html).toContain('name="robots" content="noindex"');
      const corpus = JSON.parse(
        readFileSync(
          resolve(import.meta.dirname, "../../content/ideas.json"),
          "utf8",
        ),
      );
      expect(html).not.toContain(corpus.ideas[0].text);
      for (const ideaId of ["BONG-0002", "BONG-9999", "../private"]) {
        const denied = await route.GET(new Request("https://bong.test/"), {
          params: Promise.resolve({ ideaId }),
        });
        expect(denied.status).toBe(404);
      }
    } finally {
      vi.restoreAllMocks();
      const within = relative(tmpdir(), root);
      if (!within || within.startsWith("..") || isAbsolute(within))
        throw new Error("Unsafe withdrawal fixture cleanup");
      rmSync(root, { recursive: true, force: true });
    }
  });
});
