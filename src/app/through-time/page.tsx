import Link from "next/link";
import { listPublishedTimeline } from "@/server/content";
export const metadata = {
  title: "Bong Through Time",
  description:
    "A fictional bong. Real human curiosity. Explore the stories behind big ideas.",
  alternates: { canonical: "/through-time" },
};
export default async function Timeline({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const supplied = (await searchParams).q;
  const query = (typeof supplied === "string" ? supplied : "").slice(0, 100);
  const entries = listPublishedTimeline();
  const found = entries.filter((e) =>
    `${e.title} ${e.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="page">
      <p className="eyebrow">A very unofficial history of inspiration</p>
      <h1>Bong Through Time.</h1>
      <p className="lead">
        Every great idea started somewhere. Our version involves a bong. The
        real story is a little more interesting.
      </p>
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
      {!entries.length ? (
        <div className="empty-state">
          <p className="eyebrow">The stories are still taking shape</p>
          <h2>History deserves a second look.</h2>
          <p>
            Our timeline is being prepared. Each story will separate BONG’s
            fictional version from carefully sourced history. Nothing has been
            published yet.
          </p>
          <Link className="button primary" href="/">
            Find an idea in the meantime
          </Link>
        </div>
      ) : !found.length ? (
        <div className="empty-state">
          <h2>No stories match that thought.</h2>
          <Link href="/through-time">Reset search</Link>
        </div>
      ) : (
        <div className="timeline-list">
          {found.map((entry) => (
            <article className="timeline-card" key={entry.id}>
              <p className="eyebrow">{entry.dateLabel}</p>
              <h2>
                <Link href={`/through-time/${entry.slug}`}>{entry.title}</Link>
              </h2>
              <div className="fiction">
                <strong>BONG’s version — fiction</strong>
                <p>{entry.fictionText}</p>
              </div>
              <p>{entry.summary}</p>
              <Link className="text-link" href={`/through-time/${entry.slug}`}>
                What actually happened →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
