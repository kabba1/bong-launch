import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createArtifacts,
  parseSourceCsv,
  runContentCommand,
  validateContent,
} from "../../scripts/content";
import type { Corpus } from "../../src/features/generator/types";
import { loadCorpus } from "../../src/features/generator/corpus";

const source = () =>
  readFileSync(resolve("content/source/bong_highdeas_1000_revised.csv"));
const corpus = (): Corpus =>
  JSON.parse(readFileSync(resolve("content/ideas.json"), "utf8")) as Corpus;
const exclusions = { schemaVersion: 1, excludedIds: [] };

describe("source and build integrity (DATA-01–07)", () => {
  it("compares every source row and category against all 1000 JSON entries", () => {
    const result = validateContent(source(), corpus(), exclusions);
    expect(result.corpus.ideas).toHaveLength(1000);
    expect(result.corpus.categories).toHaveLength(22);
    expect(result.activeIdeas).toHaveLength(1000);
    expect(result.sourceHash).toBe(
      "d47f279eb2cce77a5730e9dbb7ab156bd5675787e18e926cd5434b20ebe8baf9",
    );
    const drift = corpus();
    drift.ideas[777]!.text += " changed";
    expect(() => validateContent(source(), drift, exclusions)).toThrow(
      /BONG-0778/,
    );
  });

  it("parses quoted commas, escaped quotes, BOM, Unicode and multiline fields", () => {
    const csv =
      '\uFEFFid,category,idea\r\nBONG-0001,Food,"It\'s \"\"café\"\", yes.\nSecond line."\r\n';
    expect(parseSourceCsv(Buffer.from(csv))).toEqual([
      {
        id: "BONG-0001",
        category: "Food",
        idea: 'It\'s "café", yes.\nSecond line.',
      },
    ]);
    expect(() => parseSourceCsv(new Uint8Array([0xc3, 0x28]))).toThrow(
      /UTF-8/i,
    );
  });

  it("rejects malformed headers and inconsistent field counts instead of repairing source", () => {
    for (const bad of [
      "id,category,idea,extra\nBONG-0001,X,Y,Z",
      "id,idea,category\nBONG-0001,X,Y",
      "id,category,idea\nBONG-0001,X",
    ])
      expect(() => parseSourceCsv(Buffer.from(bad))).toThrow();
  });

  it("rejects unknown categories, duplicates, malformed IDs, control characters and oversized text", () => {
    const edits = [
      (data: Corpus) => {
        data.ideas[0]!.categoryId = "unknown";
      },
      (data: Corpus) => {
        data.ideas[1]!.id = data.ideas[0]!.id;
      },
      (data: Corpus) => {
        data.ideas[0]!.id = "../private";
      },
      (data: Corpus) => {
        data.ideas[0]!.text = "abc\u0000def";
      },
      (data: Corpus) => {
        data.ideas[0]!.text = "a".repeat(281);
      },
      (data: Corpus) => {
        data.ideas[0]!.text = "";
      },
    ];
    for (const edit of edits) {
      const changed = corpus();
      edit(changed);
      expect(() => validateContent(source(), changed, exclusions)).toThrow();
    }
  });

  it("rejects renaming a stable category slug even when all idea references are changed", () => {
    const changed = corpus();
    const previous = changed.categories[0]!.id;
    changed.categories[0]!.id = "renamed-category";
    for (const idea of changed.ideas)
      if (idea.categoryId === previous) idea.categoryId = "renamed-category";
    expect(() => validateContent(source(), changed, exclusions)).toThrow(
      /mapping/i,
    );
  });

  it("builds identical bytes and hashes the emitted public bytes", () => {
    const validated = validateContent(source(), corpus(), exclusions);
    const first = createArtifacts(validated);
    const second = createArtifacts(validated);
    expect(first.bytes).toEqual(second.bytes);
    const digest = createHash("sha256").update(first.bytes).digest("hex");
    expect(first.manifest.hash).toBe(digest);
    expect(first.manifest.url).toBe(`/data/ideas.${digest}.json`);
    expect(first.manifest.activeCount).toBe(1000);
    expect(first.catalogSql).toBe(second.catalogSql);
  });

  it("withdraws public text while keeping the original source and SQL ID tombstone", () => {
    const result = validateContent(source(), corpus(), {
      schemaVersion: 1,
      excludedIds: ["BONG-0001"],
    });
    const artifacts = createArtifacts(result);
    const publicCorpus = JSON.parse(artifacts.bytes.toString("utf8")) as Corpus;
    expect(publicCorpus.ideas).toHaveLength(999);
    expect(publicCorpus.ideas.some((idea) => idea.id === "BONG-0001")).toBe(
      false,
    );
    expect(result.corpus.ideas).toHaveLength(1000);
    expect(artifacts.catalogSql).toMatch(/'BONG-0001'[^\n]+false/);
    expect(artifacts.manifest.activeCount).toBe(999);
    expect(() =>
      validateContent(source(), corpus(), {
        schemaVersion: 1,
        excludedIds: ["BONG-1001"],
      }),
    ).toThrow(/unknown/i);
    expect(() =>
      validateContent(source(), corpus(), {
        schemaVersion: 1,
        excludedIds: corpus().ideas.map((idea) => idea.id),
      }),
    ).toThrow(/empty/i);
  });

  it("loads the exact hashed public corpus and rejects corrupted transport bytes", async () => {
    const artifacts = createArtifacts(
      validateContent(source(), corpus(), exclusions),
    );
    const fetcher = async (input: string | URL | Request) => {
      const url = input.toString();
      return new Response(
        url.endsWith("manifest.json")
          ? JSON.stringify(artifacts.manifest)
          : artifacts.bytes.toString("utf8"),
      );
    };
    const result = await loadCorpus(fetcher as typeof fetch);
    expect(result.corpus.ideas).toHaveLength(1000);
    expect(result.manifest.hash).toBe(artifacts.manifest.hash);
    const corrupted = async (input: string | URL | Request) =>
      new Response(
        input.toString().endsWith("manifest.json")
          ? JSON.stringify(artifacts.manifest)
          : artifacts.bytes.toString("utf8") + " ",
      );
    await expect(loadCorpus(corrupted as typeof fetch)).rejects.toThrow(
      /hash|integrity/i,
    );
  });

  it("refuses nonlocal manifest URLs and reports HTTP failure rather than an empty corpus", async () => {
    const artifacts = createArtifacts(
      validateContent(source(), corpus(), exclusions),
    );
    const unsafe = async () =>
      Response.json({
        ...artifacts.manifest,
        url: "https://other.example/corpus.json",
      });
    await expect(loadCorpus(unsafe as typeof fetch)).rejects.toThrow(
      /manifest/i,
    );
    await expect(
      loadCorpus(
        (async () => new Response(null, { status: 503 })) as typeof fetch,
      ),
    ).rejects.toThrow(/load|unavailable/i);
  });

  it("executes import/build/validate on real files and rejects drift in released artifacts", () => {
    const testRoot = mkdtempSync(join(tmpdir(), "bong-content-test-"));
    try {
      mkdirSync(join(testRoot, "content/source"), { recursive: true });
      mkdirSync(join(testRoot, "schemas"), { recursive: true });
      writeFileSync(
        join(testRoot, "content/source/bong_highdeas_1000_revised.csv"),
        source(),
      );
      writeFileSync(
        join(testRoot, "content/ideas.json"),
        JSON.stringify(corpus()),
      );
      writeFileSync(
        join(testRoot, "content/idea-overrides.json"),
        JSON.stringify(exclusions),
      );
      for (const schema of ["ideas", "timeline-entry"])
        writeFileSync(
          join(testRoot, `schemas/${schema}.schema.json`),
          readFileSync(resolve(`schemas/${schema}.schema.json`)),
        );
      runContentCommand("import", testRoot);
      expect(
        JSON.parse(readFileSync(join(testRoot, "content/ideas.json"), "utf8")),
      ).toEqual(corpus());
      runContentCommand("build", testRoot);
      const original = readFileSync(
        join(testRoot, "public/data/manifest.json"),
      );
      expect(original).toEqual(
        readFileSync(join(testRoot, "content/generated/manifest.json")),
      );
      runContentCommand("build", testRoot);
      expect(readFileSync(join(testRoot, "public/data/manifest.json"))).toEqual(
        original,
      );
      runContentCommand("validate", testRoot);
      writeFileSync(
        join(testRoot, "content/generated/catalog.sql"),
        "-- unexpected drift",
      );
      expect(() => runContentCommand("validate", testRoot)).toThrow(
        /catalog drift/i,
      );
    } finally {
      // The only recursive cleanup target is a fresh, verified per-test directory.
      if (
        !resolve(testRoot).startsWith(resolve(tmpdir()) + "\\") &&
        !resolve(testRoot).startsWith(resolve(tmpdir()) + "/")
      )
        throw new Error("Unsafe test cleanup path.");
      rmSync(testRoot, { recursive: true, force: true });
    }
  });
});
