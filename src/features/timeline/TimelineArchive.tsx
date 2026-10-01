import Link from "next/link";
import type { TimelineEntry } from "./types";
import { TimelineDock } from "./TimelineDock";

/** Shared by the static archive and its optional client search enhancement. */
export function TimelineArchive({
  entries,
  query = "",
}: {
  entries: TimelineEntry[];
  query?: string | string[];
}) {
  const searchable = entries.length >= 12;
  const q = (searchable && typeof query === "string" ? query : "").slice(
    0,
    100,
  );
  const found = entries.filter((entry) =>
    `${entry.title} ${entry.summary}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      {searchable && (
        <form className="search-form page-toolbar" action="/through-time">
          <label className="sr-only" htmlFor="history-query">
            Search history
          </label>
          <input
            className="search-input"
            id="history-query"
            name="q"
            defaultValue={q}
            key={q}
            maxLength={100}
            placeholder="Search the stories"
          />
          <button className="button quiet" type="submit">
            Search
          </button>
          {q && (
            <Link className="text-link" href="/through-time">
              Reset
            </Link>
          )}
        </form>
      )}
      {!entries.length ? (
        <div className="time-empty">
          <h2>Coming soon.</h2>
          <Link className="text-link" href="/">
            Get an idea <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : !found.length ? (
        <div className="time-empty">
          <h2>No stories match that thought.</h2>
          <Link href="/through-time">Reset search</Link>
        </div>
      ) : (
        <TimelineDock
          key={q}
          events={found.map((entry) => ({
            id: entry.id,
            date: entry.dateLabel,
            shortDate: entry.dateLabel,
            era: "Bong Through Time",
            title: entry.title,
            text: entry.summary,
            narration: entry.fictionText,
            href: `/through-time/${entry.slug}`,
            source: `${entry.sources.length} ${entry.sources.length === 1 ? "source" : "sources"}`,
            url: `/through-time/${entry.slug}#sources`,
          }))}
        />
      )}
    </>
  );
}
