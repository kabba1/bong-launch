import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimelineEntry } from "../../src/features/timeline/types";
import Timeline, { metadata } from "../../src/app/through-time/page";
import { TimelineArchive } from "../../src/features/timeline/TimelineArchive";
import Home from "../../src/app/page";
import Story, {
  generateMetadata,
} from "../../src/app/through-time/[slug]/page";

const content = vi.hoisted(() => ({ entries: [] as TimelineEntry[] }));
vi.mock("@/server/content", () => ({
  listPublishedTimeline: () => content.entries,
  getTimelineEntry: (slug: string) =>
    content.entries.find((entry) => entry.slug === slug),
}));
vi.mock("@/lib/launch-scope", () => ({ communityEnabled: () => false }));

// Isolated rendering fixtures; no invented history or source enters content/.
function entry(index: number): TimelineEntry {
  return {
    id: `fixture-${index}`,
    slug: `fixture-${index}`,
    status: "published",
    title: `Fixture entry ${index}`,
    revision: 1,
    summary:
      index === 7
        ? "A distinctive fixture summary."
        : "Test-only factual summary.",
    dateLabel: `Fixture era ${index}`,
    sortYear: index,
    datePrecision: "approximate",
    fictionText: "This is a fictional BONG test line.",
    facts: [
      { text: "Test-only factual paragraph.", sourceIds: ["fixture-source"] },
    ],
    spark: { text: "Test-only spark", sourceIds: ["fixture-source"] },
    development: {
      text: "Test-only development",
      sourceIds: ["fixture-source"],
    },
    sources: [
      {
        id: "fixture-source",
        title: "A test source",
        publisher: "A test publisher",
        url: "https://sources.invalid/test-only",
        accessedAt: "2026-01-01",
        supports: "Only this rendering test",
      },
    ],
    reviewedBy: "Test fixture only",
    reviewedAt: "2026-01-01",
  };
}
async function render(q?: string | string[]) {
  return renderToStaticMarkup(
    q === undefined
      ? await Timeline()
      : TimelineArchive({ entries: content.entries, query: q }),
  );
}

describe("TIME-UI editorial archive and search threshold", () => {
  beforeEach(() => {
    content.entries = [];
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows an intentional empty archive without search or invented articles", async () => {
    const html = await render();
    expect(html).not.toContain("No stories published yet.");
    expect(html).not.toContain("Human history</p>");
    expect(html).not.toContain("Some ideas made history.");
    expect(html).not.toContain('id="timeline-tab-handaxes"');
    expect(html).not.toMatch(
      /History is still being rewritten|checking the sources|The archive \/|Questionable inspiration|The sources remember/,
    );
    expect(html).toContain("Coming soon.");
    expect(html).toContain('href="/"');
    expect(html).not.toContain('name="q"');
    expect(html).not.toContain("<article");
    expect(html).not.toContain("No stories match");
  });

  it("shows sourced test points only in the development preview", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = await render();
    expect(html).toContain('id="timeline-tab-handaxes"');
    expect(html).toContain('aria-label="Historical timeline"');
    expect(html).toContain('aria-label="Next event"');
    expect(html).toContain("https://humanorigins.si.edu/evidence/behavior/stone-tools");
    expect(content.entries).toEqual([]);
  });

  it("ignores query parameters and keeps all 11 entries visible below the threshold", async () => {
    content.entries = Array.from({ length: 11 }, (_, i) => entry(i));
    const html = await render("a query that does not match");
    expect(html).not.toContain('name="q"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-label="Next event"');
    expect(html.match(/<article/g)).toHaveLength(11);
    expect(html).not.toContain("No stories published yet.");
    expect(html.indexOf("Fixture era 0")).toBeLessThan(
      html.indexOf("Fixture era 10"),
    );
  });

  it("marks the homepage timeline destination as coming soon while the published archive is empty", () => {
    const html = renderToStaticMarkup(Home());
    const destination = html.match(
      /<article class="thought-destination">(.*?)<\/article>/,
    )?.[1];
    expect(destination).toContain("Bong Through Time");
    expect(destination).toContain("Coming soon");
    expect(destination).toContain('href="/through-time"');
  });

  it("removes the homepage coming-soon status when a real published entry is available", () => {
    content.entries = [entry(1)];
    const html = renderToStaticMarkup(Home());
    const destination = html.match(
      /<article class="thought-destination">(.*?)<\/article>/,
    )?.[1];
    expect(destination).toContain("Bong Through Time");
    expect(destination).not.toContain("Coming soon");
    expect(destination).toContain('href="/through-time"');
  });

  it("enables search at 12 entries and searches title and factual summary", async () => {
    content.entries = Array.from({ length: 12 }, (_, i) => entry(i));
    const html = await render("distinctive");
    expect(html).toContain('name="q"');
    expect(html).toContain('value="distinctive"');
    expect(html.match(/<article/g)).toHaveLength(1);
    expect(html).toContain("Fixture entry 7");
    expect(html).toContain(">Reset</a>");
    const titleMatch = await render("Fixture entry 9");
    expect(titleMatch.match(/<article/g)).toHaveLength(1);
    expect(titleMatch).toContain("Fixture entry 9");
  });

  it("handles no results and repeated query parameters without concealing an unfiltered archive", async () => {
    content.entries = Array.from({ length: 12 }, (_, i) => entry(i));
    const missing = await render("missing fixture phrase");
    expect(missing).toContain("No stories match that thought.");
    expect(missing).not.toContain("<article");
    const repeated = await render(["one", "two"]);
    expect(repeated.match(/<article/g)).toHaveLength(12);
    expect(repeated).toContain('value=""');
  });

  it("labels fictional and factual excerpts separately and exposes the actual source count", async () => {
    const first = entry(1);
    content.entries = [
      first,
      {
        ...entry(2),
        sources: [
          first.sources[0],
          { ...first.sources[0], id: "second-fixture-source" },
        ],
      },
    ];
    const html = await render();
    expect(html.match(/BONG’s narration · Fiction/g)).toHaveLength(2);
    expect(html.match(/<h3>The history<\/h3>/g)).toHaveLength(2);
    expect(html).toContain("Test-only factual summary.");
    expect(html).toContain('href="/through-time/fixture-1#sources"');
    expect(html).toContain("1 source");
    expect(html).toContain("2 sources");
  });

  it("keeps all published entries in the static HTML before client search hydrates", async () => {
    content.entries = Array.from({ length: 12 }, (_, i) => entry(i));
    const html = await render();
    expect(html.match(/<article/g)).toHaveLength(12);
    expect(html).toContain("Search needs JavaScript.");
  });

  it("updates generic copy while preserving article-specific metadata, facts and source links", async () => {
    const fixture = entry(1);
    content.entries = [fixture];
    expect(metadata.description).toBe(
      "Some ideas made history. Explore the moments that changed how people lived, the problems they were trying to solve, and what happened next.",
    );
    expect(metadata.alternates.canonical).toBe("/through-time");
    expect(
      await generateMetadata({
        params: Promise.resolve({ slug: fixture.slug }),
      }),
    ).toEqual({
      title: fixture.title,
      description: fixture.summary,
      alternates: { canonical: `/through-time/${fixture.slug}` },
    });
    const html = renderToStaticMarkup(
      await Story({ params: Promise.resolve({ slug: fixture.slug }) }),
    );
    expect(html).toContain("BONG’s narration · Fiction");
    expect(html).toContain("<h2>The history</h2>");
    expect(html).toContain(fixture.fictionText);
    expect(html).toContain(fixture.facts[0].text);
    expect(html).toContain(`href="${fixture.sources[0].url}"`);
    expect(html).toContain('id="sources"');
    expect(html).not.toContain("Report / suggest a correction");
  });
});
