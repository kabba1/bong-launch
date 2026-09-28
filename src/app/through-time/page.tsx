import Link from "next/link";
import { listPublishedTimeline } from "@/server/content";
import "@/styles/timeline.css";
export const metadata = {
  title: "Bong Through Time",
  description:
    "The history of inventions and discoveries, alongside BONG’s fictional version of events.",
  alternates: { canonical: "/through-time" },
};
export default async function Timeline({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const supplied = (await searchParams).q;
  const entries = listPublishedTimeline();
  const searchable = entries.length >= 12;
  const query = (
    searchable && typeof supplied === "string" ? supplied : ""
  ).slice(0, 100);
  const found = entries.filter((e) =>
    `${e.title} ${e.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="page time-archive">
      <p className="eyebrow">The unofficial record</p>
      <h1>Bong Through Time.</h1>
      <p className="lead">Some ideas made history.</p>
      {searchable && (
        <form className="search-form page-toolbar" action="/through-time">
          <label className="sr-only" htmlFor="history-query">
            Search history
          </label>
          <input
            className="search-input"
            id="history-query"
            name="q"
            defaultValue={query}
            maxLength={100}
            placeholder="Search the stories"
          />
          <button className="button quiet" type="submit">
            Search
          </button>
          {query && (
            <Link className="text-link" href="/through-time">
              Reset
            </Link>
          )}
        </form>
      )}
      {!entries.length ? (
        <div className="time-empty">
          <h2>The first stories are on their way.</h2>
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
    </section>
  );
}
