import Link from "next/link";
import { notFound } from "next/navigation";
import { getTimelineEntry, listPublishedTimeline } from "@/server/content";
import type { TimelineParagraph } from "@/features/timeline/types";
import { ReportForm } from "@/features/board/ReportForm";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const entry = getTimelineEntry((await params).slug);
  return entry
    ? {
        title: entry.title,
        description: entry.summary,
        alternates: { canonical: `/through-time/${entry.slug}` },
      }
    : { title: "Story not found", robots: { index: false } };
}
function Paragraph({ paragraph }: { paragraph: TimelineParagraph }) {
  return (
    <p>
      {paragraph.text}{" "}
      <span className="tiny">
        {paragraph.sourceIds.map((id) => (
          <a key={id} href={`#source-${id}`} aria-label={`Read source ${id}`}>
            [{id}]{" "}
          </a>
        ))}
      </span>
    </p>
  );
}
export default async function Story({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const entry = getTimelineEntry((await params).slug);
  if (!entry) notFound();
  const entries = listPublishedTimeline();
  const i = entries.findIndex((e) => e.id === entry.id);
  return (
    <article className="page narrow reading">
      <Link className="text-link" href="/through-time">
        ← Through Time
      </Link>
      <p className="eyebrow">{entry.dateLabel}</p>
      <h1>{entry.title}</h1>
      <p className="lead">{entry.summary}</p>
      <div className="fiction">
        <strong>BONG’s version — fiction</strong>
        <p>{entry.fictionText}</p>
      </div>
      {entry.image && (
        <figure>
          <img src={entry.image.src} alt={entry.image.alt} />
          <figcaption className="tiny">
            {entry.image.credit} · {entry.image.rightsBasis}
          </figcaption>
        </figure>
      )}
      <h2>What actually happened</h2>
      {entry.facts.map((fact, index) => (
        <Paragraph key={index} paragraph={fact} />
      ))}
      <h2>The spark</h2>
      <Paragraph paragraph={entry.spark} />
      <h2>What came next</h2>
      <Paragraph paragraph={entry.development} />
      {entry.uncertaintyNote && (
        <aside className="notice">{entry.uncertaintyNote}</aside>
      )}
      <h2>Sources</h2>
      <ol className="source-list">
        {entry.sources.map((source) => (
          <li key={source.id} id={`source-${source.id}`}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title}
            </a>{" "}
            — {source.publisher}.<p>{source.supports}</p>
            <span className="tiny">Accessed {source.accessedAt}</span>
          </li>
        ))}
      </ol>
      <p className="tiny">
        Reviewed {entry.reviewedAt} · Revision {entry.revision}
      </p>
      {entry.correctionNote && (
        <p className="notice">Correction: {entry.correctionNote}</p>
      )}
      <ReportForm targetType="timeline" targetId={entry.slug} />
      <div className="neighbor-links">
        {entries[i - 1] && (
          <Link href={`/through-time/${entries[i - 1].slug}`}>
            ← {entries[i - 1].title}
          </Link>
        )}
        {entries[i + 1] && (
          <Link href={`/through-time/${entries[i + 1].slug}`}>
            {entries[i + 1].title} →
          </Link>
        )}
      </div>
    </article>
  );
}
