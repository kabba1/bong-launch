"use client";

import { useSearchParams } from "next/navigation";
import type { TimelineEntry } from "./types";
import { TimelineArchive } from "./TimelineArchive";

export function TimelineSearch({ entries }: { entries: TimelineEntry[] }) {
  const params = useSearchParams();
  const queries = params.getAll("q");
  return (
    <TimelineArchive
      entries={entries}
      query={queries.length === 1 ? queries[0] : ""}
    />
  );
}
