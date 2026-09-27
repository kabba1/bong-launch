import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import { parse } from "csv-parse/sync";
import type {
  Corpus,
  CorpusManifest,
  Idea,
} from "../src/features/generator/types";
import { loadPublishedTimeline } from "../src/features/timeline/content";
import { siteSchema, policySchema } from "../src/lib/content-config";

const INITIAL_SOURCE_HASH =
  "d47f279eb2cce77a5730e9dbb7ab156bd5675787e18e926cd5434b20ebe8baf9";
const INITIAL_CATEGORY_MAP_HASH =
  "f1f6e396ab028b1eafd38f8e243ac82319a39f784c4bcd36c8ba8f7d32bcd547";
const SOURCE_PATH = "content/source/bong_highdeas_1000_revised.csv";
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
interface SourceRow {
  id: string;
  category: string;
  idea: string;
}
export interface ValidatedContent {
  corpus: Corpus;
  sourceHash: string;
  activeIdeas: Idea[];
  excludedIds: string[];
}
export interface ContentArtifacts {
  bytes: Buffer;
  manifest: CorpusManifest;
  catalogSql: string;
  lookup: { ideas: Record<string, Idea>; withdrawnIds: string[] };
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)),
    ) as unknown;
  } catch {
    throw new Error(`${path}: invalid UTF-8 or JSON.`);
  }
}

export function parseSourceCsv(bytes: Uint8Array): SourceRow[] {
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Source CSV is not valid UTF-8.");
  }
  try {
    return parse(decoded, {
      bom: true,
      columns: (headers: string[]) => {
        if (headers.length !== 3 || headers.join(",") !== "id,category,idea")
          throw new Error("Expected exact CSV headers id,category,idea.");
        return headers;
      },
      skip_empty_lines: false,
      relax_column_count: false,
      max_record_size: 16_384,
    }) as SourceRow[];
  } catch (error) {
    throw new Error(
      `Source CSV parse error: ${error instanceof Error ? error.message : "invalid record"}`,
    );
  }
}

export function validateContent(
  bytes: Uint8Array,
  candidate: unknown,
  overrides: unknown,
  root = process.cwd(),
): ValidatedContent {
  const sourceHash = sha256(bytes);
  const rows = parseSourceCsv(bytes);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const schema = readJson(resolve(root, "schemas/ideas.schema.json")) as object;
  const validate = ajv.compile(schema);
  if (!validate(candidate)) {
    const affected = validate.errors
      ?.find((error) => error.instancePath.startsWith("/ideas/"))
      ?.instancePath.split("/")[2];
    const raw = candidate as unknown as { ideas?: unknown } | null;
    const context =
      affected && raw && Array.isArray(raw.ideas)
        ? `row ${Number(affected) + 2} (${(raw.ideas[Number(affected)] as { id?: string })?.id ?? "unknown ID"})`
        : "corpus";
    throw new Error(
      `${context}: ${ajv.errorsText(validate.errors, { separator: "; " })}`,
    );
  }
  const corpus = candidate as Corpus;
  if (rows.length !== 1000 || corpus.ideas.length !== 1000)
    throw new Error(
      "The initial corpus must contain exactly 1,000 source and JSON records.",
    );
  if (corpus.categories.length !== 22)
    throw new Error("The initial corpus must preserve all 22 categories.");
  if (
    sha256(
      JSON.stringify(corpus.categories.map(({ id, label }) => ({ id, label }))),
    ) !== INITIAL_CATEGORY_MAP_HASH
  )
    throw new Error(
      "Stable supplied category mapping drift; approve a manifest revision before changing slugs or labels.",
    );
  if (corpus.datasetId !== "bong-1000-v1")
    throw new Error(
      "Unexpected initial dataset version; revise the expected manifest through editorial review.",
    );
  const categoryLabels = new Map(
    corpus.categories.map((category) => [category.id, category.label]),
  );
  if (
    categoryLabels.size !== corpus.categories.length ||
    new Set(categoryLabels.values()).size !== corpus.categories.length
  )
    throw new Error("Duplicate category IDs or labels.");
  const sourceById = new Map<string, SourceRow>();
  for (const [index, row] of rows.entries()) {
    const context = `Source row ${index + 2} (${row.id})`;
    if (
      !/^BONG-\d{4}$/.test(row.id) ||
      !row.category.trim() ||
      !row.idea.trim()
    )
      throw new Error(`${context}: invalid ID or blank category/idea.`);
    if (/\p{Cc}/u.test(row.id + row.category + row.idea))
      throw new Error(`${context}: control characters are forbidden.`);
    if ([...row.idea].length > 280 || [...row.category].length > 80)
      throw new Error(`${context}: a field exceeds its code-point limit.`);
    if (sourceById.has(row.id))
      throw new Error(`${context}: duplicate source ID.`);
    sourceById.set(row.id, row);
  }
  const ids = new Set<string>();
  for (const [index, idea] of corpus.ideas.entries()) {
    const context = `JSON row ${index + 2} (${idea.id})`;
    if (ids.has(idea.id)) throw new Error(`${context}: duplicate idea ID.`);
    ids.add(idea.id);
    if (!idea.text.trim() || /\p{Cc}/u.test(idea.text))
      throw new Error(`${context}: empty text or control character.`);
    const label = categoryLabels.get(idea.categoryId);
    if (!label)
      throw new Error(`${context}: unknown category ${idea.categoryId}.`);
    const source = sourceById.get(idea.id);
    if (!source || source.idea !== idea.text || source.category !== label)
      throw new Error(
        `${context}: source-to-JSON text/category equality failed.`,
      );
  }
  for (let index = 1; index <= 1000; index += 1) {
    const id = `BONG-${String(index).padStart(4, "0")}`;
    if (!ids.has(id) || !sourceById.has(id))
      throw new Error(`Missing initial ID ${id}.`);
  }
  if (new Set(rows.map((row) => row.category)).size !== 22)
    throw new Error(
      "Source category inventory differs from the supplied 22 labels.",
    );
  if (sourceHash !== corpus.sourceSha256 || sourceHash !== INITIAL_SOURCE_HASH)
    throw new Error(
      "Source SHA-256 drift; preserve the supplied input bytes (including CRLF record endings). Ensure the checked-in .gitattributes is applied; do not normalize CSV bytes or replace its expected hash to bypass integrity checks.",
    );
  if (
    typeof overrides !== "object" ||
    overrides === null ||
    Array.isArray(overrides)
  )
    throw new Error("Invalid idea overrides.");
  const values = overrides as Record<string, unknown>;
  if (
    Object.keys(values).some(
      (key) => !["schemaVersion", "excludedIds"].includes(key),
    ) ||
    values.schemaVersion !== 1 ||
    !Array.isArray(values.excludedIds)
  )
    throw new Error("Invalid idea override schema.");
  const excludedIds = values.excludedIds;
  if (new Set(excludedIds).size !== excludedIds.length)
    throw new Error("Duplicate withdrawal ID.");
  for (const id of excludedIds)
    if (typeof id !== "string" || !ids.has(id))
      throw new Error(`Unknown withdrawal ID: ${String(id)}.`);
  const excluded = new Set(excludedIds as string[]);
  const activeIdeas = corpus.ideas.filter((idea) => !excluded.has(idea.id));
  if (activeIdeas.length === 0)
    throw new Error("The active production corpus is empty.");
  return { corpus, sourceHash, activeIdeas, excludedIds: [...excluded].sort() };
}

export function createArtifacts(validated: ValidatedContent): ContentArtifacts {
  const corpus: Corpus = {
    schemaVersion: 1,
    datasetId: validated.corpus.datasetId,
    sourceSha256: validated.sourceHash,
    categories: validated.corpus.categories.map(({ id, label }) => ({
      id,
      label,
    })),
    ideas: [...validated.activeIdeas]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, categoryId, text }) => ({ id, categoryId, text })),
  };
  const bytes = Buffer.from(JSON.stringify(corpus), "utf8");
  const hash = sha256(bytes);
  const manifest: CorpusManifest = {
    schemaVersion: 1,
    datasetId: corpus.datasetId,
    sourceSha256: validated.sourceHash,
    hash,
    url: `/data/ideas.${hash}.json`,
    activeCount: corpus.ideas.length,
    categoryCount: corpus.categories.length,
  };
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const withdrawn = new Set(validated.excludedIds);
  const rows = [...validated.corpus.ideas]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (idea) =>
        `  (${quote(idea.id)}, ${quote(idea.categoryId)}, ${quote(sha256(idea.text))}, ${quote(hash)}, ${!withdrawn.has(idea.id)})`,
    );
  const catalogSql = `-- Generated from source ${validated.sourceHash}; public bytes ${hash}.\n-- Apply with the migration identity before deploying this matching content release.\nBEGIN;\nINSERT INTO bong.idea_catalog (id, category_id, source_text_sha256, dataset_version, active) VALUES\n${rows.join(",\n")}\nON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, source_text_sha256 = EXCLUDED.source_text_sha256, dataset_version = EXCLUDED.dataset_version, active = EXCLUDED.active;\nCOMMIT;\n`;
  return {
    bytes,
    manifest,
    catalogSql,
    lookup: {
      ideas: Object.fromEntries(corpus.ideas.map((idea) => [idea.id, idea])),
      withdrawnIds: [...validated.excludedIds],
    },
  };
}

export function runContentCommand(command: string, root = process.cwd()): void {
  if (!["import", "validate", "build"].includes(command))
    throw new Error("Usage: tsx scripts/content.ts import|validate|build");
  const sitePath = resolve(root, "content/site.json");
  if (existsSync(sitePath)) siteSchema.parse(readJson(sitePath));
  const legalPath = resolve(root, "content/legal");
  if (existsSync(legalPath))
    for (const file of readdirSync(legalPath).filter((f) =>
      f.endsWith(".json"),
    ))
      policySchema.parse(readJson(resolve(legalPath, file)));
  const source = readFileSync(resolve(root, SOURCE_PATH));
  const existing = readJson(resolve(root, "content/ideas.json")) as Corpus;
  const overrides = readJson(resolve(root, "content/idea-overrides.json"));
  let candidate = existing;
  if (command === "import") {
    const categoryIds = new Map(
      existing.categories.map((category) => [category.label, category.id]),
    );
    candidate = {
      schemaVersion: 1,
      datasetId: existing.datasetId,
      sourceSha256: sha256(source),
      categories: existing.categories,
      ideas: parseSourceCsv(source).map((row) => {
        const categoryId = categoryIds.get(row.category);
        if (!categoryId)
          throw new Error(
            `${row.id}: no reviewed category mapping for ${row.category}.`,
          );
        return { id: row.id, categoryId, text: row.idea };
      }),
    };
  }
  const validated = validateContent(source, candidate, overrides, root);
  const timeline = loadPublishedTimeline(root);
  const artifacts = createArtifacts(validated);
  if (command === "import")
    writeFileSync(
      resolve(root, "content/ideas.json"),
      `${JSON.stringify(candidate, null, 2)}\n`,
      "utf8",
    );
  if (command === "build") {
    const publicData = resolve(root, "public/data");
    const generated = resolve(root, "content/generated");
    mkdirSync(publicData, { recursive: true });
    mkdirSync(generated, { recursive: true });
    // Remove only obsolete generated corpus files, so withdrawals are not bundled under old names.
    for (const file of readdirSync(publicData)) {
      if (
        /^ideas\.[a-f0-9]{64}\.json$/.test(file) &&
        file !== basename(artifacts.manifest.url)
      )
        unlinkSync(resolve(publicData, file));
    }
    const manifestBytes = `${JSON.stringify(artifacts.manifest, null, 2)}\n`;
    writeFileSync(
      resolve(publicData, basename(artifacts.manifest.url)),
      artifacts.bytes,
    );
    writeFileSync(resolve(publicData, "manifest.json"), manifestBytes);
    writeFileSync(resolve(generated, "manifest.json"), manifestBytes);
    writeFileSync(resolve(generated, "catalog.sql"), artifacts.catalogSql);
    writeFileSync(
      resolve(generated, "idea-lookup.json"),
      JSON.stringify(artifacts.lookup),
    );
    writeFileSync(
      resolve(generated, "timeline.json"),
      JSON.stringify(timeline),
    );
  }
  if (command === "validate") {
    const manifestPath = resolve(root, "content/generated/manifest.json");
    if (existsSync(manifestPath)) {
      const publicManifest = readJson(
        resolve(root, "public/data/manifest.json"),
      );
      const privateManifest = readJson(manifestPath);
      if (
        JSON.stringify(privateManifest) !==
          JSON.stringify(artifacts.manifest) ||
        JSON.stringify(publicManifest) !== JSON.stringify(artifacts.manifest)
      )
        throw new Error(
          "Generated manifest drift; rebuild content before release.",
        );
      const emitted = readFileSync(
        resolve(root, "public", artifacts.manifest.url.slice(1)),
      );
      if (!emitted.equals(artifacts.bytes))
        throw new Error("Generated public corpus bytes drift from source.");
      if (
        readFileSync(resolve(root, "content/generated/catalog.sql"), "utf8") !==
        artifacts.catalogSql
      )
        throw new Error("SQL catalog drift from content artifact.");
      if (
        readFileSync(
          resolve(root, "content/generated/idea-lookup.json"),
          "utf8",
        ) !== JSON.stringify(artifacts.lookup)
      )
        throw new Error("Server idea lookup drift from content artifact.");
      if (
        readFileSync(
          resolve(root, "content/generated/timeline.json"),
          "utf8",
        ) !== JSON.stringify(timeline)
      )
        throw new Error("Published timeline drift from reviewed content.");
    }
  }
  process.stdout.write(
    `Content ${command}: 1000 exact source rows, 22 categories, ${artifacts.manifest.activeCount} active ideas, ${timeline.length} published timeline entries.\nSHA-256 ${artifacts.manifest.hash}\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    runContentCommand(process.argv[2] ?? "");
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Content operation failed."}\n`,
    );
    process.exitCode = 1;
  }
}
