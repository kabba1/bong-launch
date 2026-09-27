import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { TimelineEntry } from "./types";

function httpsUrl(value: string, context: string): void {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      !parsed.hostname ||
      /[\p{Cc}\s]/u.test(value)
    )
      throw new Error();
  } catch {
    throw new Error(
      `${context}: a safe HTTPS URL without credentials is required.`,
    );
  }
}

export function validateTimelineEntries(
  entries: unknown[],
  root = process.cwd(),
): TimelineEntry[] {
  // The supplied valid schema declares fields at the root and requires them in
  // a conditional `then`. Disable only AJV's same-subschema authoring lint;
  // actual required-field validation remains enabled and is regression-tested.
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
  });
  addFormats(ajv);
  const schema: object = JSON.parse(
    readFileSync(resolve(root, "schemas/timeline-entry.schema.json"), "utf8"),
  ) as object;
  const validate = ajv.compile(schema);
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const published: TimelineEntry[] = [];
  for (const candidate of entries) {
    if (!validate(candidate))
      throw new Error(
        `Invalid timeline entry: ${ajv.errorsText(validate.errors, { separator: "; " })}`,
      );
    const entry = candidate as TimelineEntry;
    if (ids.has(entry.id) || slugs.has(entry.slug))
      throw new Error(
        `Duplicate timeline ID or slug: ${entry.id}/${entry.slug}.`,
      );
    ids.add(entry.id);
    slugs.add(entry.slug);
    if (entry.status !== "published") continue;
    const sourceIds = new Set(entry.sources.map((source) => source.id));
    if (sourceIds.size !== entry.sources.length)
      throw new Error(`${entry.id}: duplicate source ID.`);
    for (const paragraph of [...entry.facts, entry.spark, entry.development]) {
      for (const sourceId of paragraph.sourceIds) {
        if (!sourceIds.has(sourceId))
          throw new Error(`${entry.id}: missing source reference ${sourceId}.`);
      }
    }
    for (const source of entry.sources)
      httpsUrl(source.url, `${entry.id}/${source.id}`);
    if (entry.reviewedAt > new Date().toISOString().slice(0, 10))
      throw new Error(`${entry.id}: review date is in the future.`);
    if (entry.image) {
      const allowedRoot = resolve(root, "public/images/timeline");
      const imagePath = resolve(root, "public", entry.image.src.slice(1));
      const within = relative(allowedRoot, imagePath);
      if (!within || within.startsWith("..") || isAbsolute(within))
        throw new Error(`${entry.id}: unsafe image path.`);
      if (!existsSync(imagePath))
        throw new Error(`${entry.id}: historical image does not exist.`);
      const realWithin = relative(
        realpathSync(allowedRoot),
        realpathSync(imagePath),
      );
      if (realWithin.startsWith("..") || isAbsolute(realWithin))
        throw new Error(
          `${entry.id}: historical image escapes the approved directory.`,
        );
      if (entry.image.licenseUrl)
        httpsUrl(entry.image.licenseUrl, `${entry.id} image license`);
    }
    published.push(entry);
  }
  // A range uses its documented start year in sortYear; dateLabel is display-only.
  return published.sort(
    (left, right) =>
      left.sortYear - right.sortYear ||
      left.slug.localeCompare(right.slug, "en"),
  );
}

export function loadPublishedTimeline(root = process.cwd()): TimelineEntry[] {
  const directory = resolve(root, "content/timeline");
  if (!existsSync(directory)) return [];
  const entries = readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const bytes = readFileSync(resolve(directory, file));
      try {
        return JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        ) as unknown;
      } catch {
        throw new Error(`Timeline ${file}: invalid UTF-8 or JSON.`);
      }
    });
  const published = validateTimelineEntries(entries, root);
  for (const entry of published) {
    const editorialIdentity = [
      entry.id,
      entry.slug,
      entry.title,
      entry.reviewedBy,
      entry.image?.rightsReviewedBy ?? "",
    ].join(" ");
    if (
      /\b(?:fixture|placeholder|lorem ipsum|test actor|tbd)\b/i.test(
        editorialIdentity,
      )
    )
      throw new Error(
        `${entry.id}: fixture or placeholder editorial metadata cannot enter production content.`,
      );
    for (const source of entry.sources) {
      const host = new URL(source.url).hostname;
      if (
        /^(?:.+\.)?example\.(?:com|org|net)$/i.test(host) ||
        /(?:^localhost$|\.(?:test|invalid|localhost)$)/i.test(host)
      )
        throw new Error(
          `${entry.id}: fixture source domains cannot enter production content.`,
        );
    }
  }
  // This structural gate cannot authenticate reviewer identity or source truth;
  // the independent owner/editorial approval remains a mandatory release gate.
  return published;
}
