import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CorpusManifest, Idea } from "../features/generator/types";
import type { TimelineEntry } from "../features/timeline/types";
import corpus from "../../content/ideas.json";

interface Lookup {
  ideas: Record<string, Idea>;
  withdrawnIds: string[];
}
let lookup: Lookup | undefined;
let manifest: CorpusManifest | undefined;
let timeline: TimelineEntry[] | undefined;

function readGenerated<T>(filename: string): T {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "content/generated", filename), "utf8"),
  ) as T;
}

function getLookup(): Lookup {
  return (lookup ??= readGenerated<Lookup>("idea-lookup.json"));
}

export function getCorpusManifest(): CorpusManifest {
  return (manifest ??= readGenerated<CorpusManifest>("manifest.json"));
}
export const getManifest = getCorpusManifest;
export const getCategoryLabel = (id: string) =>
  corpus.categories.find((category) => category.id === id)?.label;

export function getIdea(id: string): Idea | undefined {
  return /^BONG-\d{4}$/.test(id) ? getLookup().ideas[id] : undefined;
}

export function getAllIdeas(): Idea[] {
  return Object.values(getLookup().ideas);
}

export function getIdeaStatus(id: string): "active" | "withdrawn" | "unknown" {
  if (!/^BONG-\d{4}$/.test(id)) return "unknown";
  if (getLookup().ideas[id]) return "active";
  return getLookup().withdrawnIds.includes(id) ? "withdrawn" : "unknown";
}

export function listPublishedTimeline(): TimelineEntry[] {
  return (timeline ??= readGenerated<TimelineEntry[]>("timeline.json"));
}

export function getTimelineEntry(slug: string): TimelineEntry | undefined {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
    return undefined;
  return listPublishedTimeline().find((entry) => entry.slug === slug);
}
