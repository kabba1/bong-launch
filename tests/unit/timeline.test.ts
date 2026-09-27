import { describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import {
  loadPublishedTimeline,
  validateTimelineEntries,
} from "../../src/features/timeline/content";

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
