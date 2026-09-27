import type { Corpus, CorpusManifest } from "./types";

const SHA256 = /^[a-f0-9]{64}$/;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseManifest(value: unknown): CorpusManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.hash !== "string" ||
    !SHA256.test(value.hash) ||
    value.url !== `/data/ideas.${value.hash}.json` ||
    typeof value.datasetId !== "string" ||
    !value.datasetId ||
    value.datasetId.length > 80 ||
    typeof value.sourceSha256 !== "string" ||
    !SHA256.test(value.sourceSha256) ||
    typeof value.activeCount !== "number" ||
    !Number.isInteger(value.activeCount) ||
    value.activeCount < 1 ||
    value.activeCount > 4000 ||
    typeof value.categoryCount !== "number" ||
    !Number.isInteger(value.categoryCount) ||
    value.categoryCount < 1 ||
    value.categoryCount > 100
  ) {
    throw new Error(
      "The idea manifest is invalid. Please reload and try again.",
    );
  }
  return value as unknown as CorpusManifest;
}

function parseCorpus(value: unknown, manifest: CorpusManifest): Corpus {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.datasetId !== manifest.datasetId ||
    value.sourceSha256 !== manifest.sourceSha256 ||
    !Array.isArray(value.categories) ||
    value.categories.length !== manifest.categoryCount ||
    !Array.isArray(value.ideas) ||
    value.ideas.length !== manifest.activeCount
  ) {
    throw new Error("The idea collection does not match its manifest.");
  }
  const categories = new Set<string>();
  for (const item of value.categories) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) ||
      categories.has(item.id) ||
      typeof item.label !== "string" ||
      !item.label.trim() ||
      [...item.label].length > 80 ||
      /\p{Cc}/u.test(item.label)
    ) {
      throw new Error("The idea collection contains an invalid category.");
    }
    categories.add(item.id);
  }
  const ids = new Set<string>();
  for (const item of value.ideas) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !/^BONG-\d{4}$/.test(item.id) ||
      ids.has(item.id) ||
      typeof item.categoryId !== "string" ||
      !categories.has(item.categoryId) ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      [...item.text].length > 280 ||
      /\p{Cc}/u.test(item.text)
    ) {
      throw new Error("The idea collection contains an invalid idea.");
    }
    ids.add(item.id);
  }
  return value as unknown as Corpus;
}

async function readBounded(
  response: Response,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok)
    throw new Error(
      "The idea collection is temporarily unavailable. Please try loading it again.",
    );
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > limit)
    throw new Error("The idea collection exceeds its supported size.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The idea collection could not be loaded.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > limit) {
        await reader.cancel();
        throw new Error("The idea collection exceeds its supported size.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function loadCorpus(
  fetcher: typeof fetch = fetch,
): Promise<{ corpus: Corpus; manifest: CorpusManifest }> {
  const manifestBytes = await readBounded(
    await fetcher("/data/manifest.json", {
      cache: "no-cache",
      credentials: "omit",
      redirect: "error",
    }),
    4096,
  );
  const decode = new TextDecoder("utf-8", { fatal: true });
  const manifest = parseManifest(
    JSON.parse(decode.decode(manifestBytes)) as unknown,
  );
  const bytes = await readBounded(
    await fetcher(manifest.url, {
      cache: "force-cache",
      credentials: "omit",
      redirect: "error",
    }),
    2 * 1024 * 1024,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== manifest.hash)
    throw new Error(
      "The idea collection failed its integrity hash check. Please reload.",
    );
  const corpus = parseCorpus(
    JSON.parse(decode.decode(bytes)) as unknown,
    manifest,
  );
  return { corpus, manifest };
}
