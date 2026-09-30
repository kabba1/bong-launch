import Link from "next/link";
import type { TimelineEntry } from "./types";

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
          <h2>No stories published yet.</h2>
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
        <ol className="time-entries" aria-label="Chronological archive">
          {found.map((entry) => (
            <li className="time-entry" key={entry.id}>
              <article>
                <p className="time-date">{entry.dateLabel}</p>
                <div className="time-entry-body">
                  <h2>
                    <Link href={`/through-time/${entry.slug}`}>
                      {entry.title}
                    </Link>
                  </h2>
                  <div className="time-versions">
                    <div className="time-fiction">
                      <h3>BONG’s version · Fiction</h3>
                      <p>{entry.fictionText}</p>
                    </div>
                    <div className="time-facts">
                      <h3>The history</h3>
                      <p>{entry.summary}</p>
                    </div>
                  </div>
                  <div className="time-entry-links">
                    <Link
                      className="text-link"
                      href={`/through-time/${entry.slug}`}
                    >
                      Read the story <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      className="time-source-count"
                      href={`/through-time/${entry.slug}#sources`}
                    >
                      {entry.sources.length}{" "}
                      {entry.sources.length === 1 ? "source" : "sources"}
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
