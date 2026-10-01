import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  loadPublishedTimeline,
  validateTimelineEntries,
} from "../../src/features/timeline/content";
import { runContentCommand } from "../../scripts/content";
import { evaluateRelease } from "../../scripts/release-policy";

// Isolated validation fixture, intentionally never written to production content.
const entry = (slug = "fixture-entry", sortYear = -300) => ({
  id: `BT-${slug.toUpperCase()}`,
  slug,
  status: "published",
  title: "Isolated validation fixture",
  revision: 1,
  summary: "Fixture summary.",
  dateLabel: "Around 300 BCE",
  sortYear,
  datePrecision: "approximate",
  fictionText: "An explicitly fictional fixture.",
  facts: [{ text: "A fixture claim.", sourceIds: ["record-a"] }],
  spark: { text: "Fixture observation.", sourceIds: ["record-a"] },
  development: { text: "Fixture development.", sourceIds: ["record-b"] },
  sources: [
    {
      id: "record-a",
      title: "Fixture A",
      publisher: "Fixture institution",
      url: "https://example.org/a",
      accessedAt: "2026-09-27",
      supports: "Fixture claim.",
    },
    {
      id: "record-b",
      title: "Fixture B",
      publisher: "Fixture institution",
      url: "https://example.org/b",
      accessedAt: "2026-09-27",
      supports: "Fixture development.",
    },
  ],
  reviewedBy: "Isolated test actor",
  reviewedAt: "2026-09-27",
});

// Unreviewed drafts only; no content or approval records are added to the repo.
const drafts = () =>
  Array.from({ length: 8 }, (_, index) => ({
    id: `BT-DRAFT-${index + 1}`,
    slug: `draft-${index + 1}`,
    status: "draft" as const,
    title: `Isolated draft fixture ${index + 1}`,
    revision: 1,
    ...(index === 0
      ? {
          facts: [
            {
              text: "Unpublished fixture claim.",
              sourceIds: ["missing-source"],
            },
          ],
        }
      : {}),
  }));

async function withDraftContent(
  check: (
    root: string,
    entries: ReturnType<typeof drafts>,
  ) => void | Promise<void>,
) {
  const root = mkdtempSync(join(tmpdir(), "bong-drafts-test-"));
  const entries = drafts();
  try {
    for (const folder of ["content/source", "content/timeline", "schemas"])
      mkdirSync(join(root, folder), { recursive: true });
    for (const file of [
      "content/source/bong_highdeas_1000_revised.csv",
      "content/ideas.json",
      "content/idea-overrides.json",
      "schemas/ideas.schema.json",
      "schemas/timeline-entry.schema.json",
    ])
      writeFileSync(
        join(root, file),
        readFileSync(resolve(import.meta.dirname, "../..", file)),
      );
    for (const draft of entries)
      writeFileSync(
        join(root, "content/timeline", `${draft.slug}.json`),
        JSON.stringify(draft),
      );
    await check(root, entries);
    for (const draft of entries)
      expect(
        JSON.parse(
          readFileSync(
            join(root, "content/timeline", `${draft.slug}.json`),
            "utf8",
          ),
        ),
      ).toEqual(draft);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    const within = relative(tmpdir(), root);
    if (!within || within.startsWith("..") || isAbsolute(within))
      throw new Error("Unsafe draft fixture cleanup path.");
    rmSync(root, { recursive: true, force: true });
  }
}

describe("unreviewed timeline drafts (TIME-01/02/08/09, DATA-10, OPS-13)", () => {
  it("validates eight drafts without reviews while still enforcing their schema", () => {
    const entries = drafts();
    expect(entries).toHaveLength(8);
    for (const draft of entries) {
      expect(draft).not.toHaveProperty("reviewedBy");
      expect(draft).not.toHaveProperty("reviewedAt");
    }
    expect(validateTimelineEntries(entries)).toEqual([]);
    expect(() =>
      validateTimelineEntries([{ ...entries[0], revision: 0 }]),
    ).toThrow(/Invalid timeline entry/);
    expect(() =>
      validateTimelineEntries([{ ...entries[0], status: "published" }]),
    ).toThrow(/reviewedBy|reviewedAt/);
  });

  it("excludes article drafts without requiring eight articles to publish the v1 dock", async () => {
    await withDraftContent((root) => {
      expect(loadPublishedTimeline(root)).toEqual([]);
      runContentCommand("build", root);
      runContentCommand("validate", root);
      const published = JSON.parse(
        readFileSync(join(root, "content/generated/timeline.json"), "utf8"),
      );
      expect(published).toEqual([]);
      const release = evaluateRelease({
        timelineCount: published.length,
        activeIdeas: 1000,
        contacts: {},
        legal: [],
        approvals: {},
        environment: "staging",
        configured: [],
        checks: {},
        communityEnabled: false,
      });
      expect(release.ready).toBe(false);
      expect(release.blockers).not.toContain(
        "At least eight genuine reviewed timeline articles are required.",
      );
    });
  });

  it("keeps draft titles, URLs and detail pages out of the actual public loaders and rendering", async () => {
    await withDraftContent(async (root, entries) => {
      runContentCommand("build", root);
      vi.spyOn(process, "cwd").mockReturnValue(root);
      vi.stubEnv("APP_ENV", "production");
      vi.stubEnv("APP_ORIGIN", "https://bong.test");
      vi.stubEnv("COMMUNITY_ENABLED", "false");
      vi.resetModules();
      const content = await import("../../src/server/content");
      const archive = await import("../../src/app/through-time/page");
      const detail = await import("../../src/app/through-time/[slug]/page");
      const sitemap = (await import("../../src/app/sitemap")).default();
      const html = renderToStaticMarkup(await archive.default());
      expect(content.listPublishedTimeline()).toEqual([]);
      expect(detail.generateStaticParams()).toEqual([]);
      expect(detail.dynamicParams).toBe(false);
      expect(html).not.toContain("No stories published yet.");
      expect(html).toContain('id="timeline-tab-handaxes"');
      expect(html).not.toContain('class="time-entry"');
      expect(sitemap.some((item) => item.url.endsWith("/through-time"))).toBe(
        true,
      );
      for (const draft of entries) {
        expect(content.getTimelineEntry(draft.slug)).toBeUndefined();
        expect(html).not.toContain(draft.title);
        expect(html).not.toContain(`/through-time/${draft.slug}`);
        expect(
          sitemap.some((item) => item.url.endsWith(`/${draft.slug}`)),
        ).toBe(false);
        const props = { params: Promise.resolve({ slug: draft.slug }) };
        expect(await detail.generateMetadata(props)).toEqual({
          title: "Story not found",
          robots: { index: false },
        });
        await expect(detail.default(props)).rejects.toThrow(
          /NEXT_HTTP_ERROR_FALLBACK;404/,
        );
      }
    });
  });

  it("never emits an unresolved draft source and refuses that reference if publication is attempted", async () => {
    await withDraftContent((root, entries) => {
      const draft = entries[0]!;
      expect(draft.facts?.[0]?.sourceIds).toEqual(["missing-source"]);
      expect(validateTimelineEntries(entries, root)).toEqual([]);
      runContentCommand("build", root);
      const generated = join(root, "content/generated/timeline.json");
      expect(readFileSync(generated, "utf8")).toBe("[]");
      // Reuse the existing isolated published fixture, never a real reviewer record.
      const attempted = { ...entry(), ...draft, status: "published" };
      expect(() => validateTimelineEntries([attempted], root)).toThrow(
        /missing source reference missing-source/,
      );
      const candidatePath = join(root, "content/timeline/draft-1.json");
      writeFileSync(candidatePath, JSON.stringify(attempted));
      try {
        expect(() => runContentCommand("build", root)).toThrow(
          /missing source reference missing-source/,
        );
        expect(readFileSync(generated, "utf8")).toBe("[]");
      } finally {
        writeFileSync(candidatePath, JSON.stringify(draft));
      }
    });
  });
});

describe("timeline validation (TIME-01/02/05/06/08)", () => {
  it("requires actual publishing fields and excludes drafts from the returned public collection", () => {
    expect(() =>
      validateTimelineEntries([
        { id: "BT-A", slug: "a", status: "published", title: "A", revision: 1 },
      ]),
    ).toThrow(/reviewed|summary|required/i);
    expect(
      validateTimelineEntries([
        { id: "BT-A", slug: "a", status: "draft", title: "A", revision: 1 },
      ]),
    ).toEqual([]);
  });

  it("requires unique source records and resolves every factual relationship", () => {
    const unknown = entry();
    unknown.spark.sourceIds = ["missing"];
    expect(() => validateTimelineEntries([unknown])).toThrow(/missing/);
    const duplicate = entry();
    duplicate.sources[1]!.id = "record-a";
    expect(() => validateTimelineEntries([duplicate])).toThrow(/duplicate/i);
    expect(() => validateTimelineEntries([entry(), entry()])).toThrow(
      /duplicate/i,
    );
  });

  it("orders BCE and later entries numerically without parsing human display dates", () => {
    const old = entry("older", -600);
    old.dateLabel = "circa 600 BCE";
    const newer = entry("newer", 1800);
    expect(
      validateTimelineEntries([newer, old]).map((item) => item.slug),
    ).toEqual(["older", "newer"]);
  });

  it("rejects credential-bearing URLs and unsafe or nonexistent historical assets", () => {
    const unsafe = entry();
    unsafe.sources[0]!.url = "https://user:password@example.org/";
    expect(() => validateTimelineEntries([unsafe])).toThrow(/URL|credentials/i);
    const image = {
      src: "/images/timeline/missing.webp",
      alt: "Fixture illustration",
      credit: "Fixture credit",
      rightsBasis: "Fixture rights only",
      rightsReviewedBy: "Isolated test actor",
    };
    expect(() => validateTimelineEntries([{ ...entry(), image }])).toThrow(
      /exist/i,
    );
    expect(() =>
      validateTimelineEntries([
        {
          ...entry(),
          image: { ...image, src: "/images/timeline/../../private.png" },
        },
      ]),
    ).toThrow();
  });

  it("refuses identifiable fixture material in the actual production content loader", () => {
    const testRoot = mkdtempSync(join(tmpdir(), "bong-timeline-test-"));
    try {
      mkdirSync(join(testRoot, "content/timeline"), { recursive: true });
      mkdirSync(join(testRoot, "schemas"), { recursive: true });
      writeFileSync(
        join(testRoot, "schemas/timeline-entry.schema.json"),
        readFileSync(resolve("schemas/timeline-entry.schema.json")),
      );
      writeFileSync(
        join(testRoot, "content/timeline/entry.json"),
        JSON.stringify(entry()),
      );
      expect(() => loadPublishedTimeline(testRoot)).toThrow(
        /fixture|placeholder/i,
      );
    } finally {
      if (relative(tmpdir(), testRoot).startsWith(".."))
        throw new Error("Unsafe test cleanup path.");
      rmSync(testRoot, { recursive: true, force: true });
    }
  });
});
