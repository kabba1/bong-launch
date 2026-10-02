import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getIdea,
  getIdeaStatus,
  getCorpusManifest,
  getCategoryLabel,
  getAllIdeas,
} from "@/server/content";
import { IdeaActions } from "@/features/generator/IdeaActions";
import { ReportForm } from "@/features/board/ReportForm";
import { communityEnabled } from "@/lib/launch-scope";
export const dynamicParams = false;
export function generateStaticParams() {
  return getAllIdeas().map(({ id }) => ({ ideaId: id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}): Promise<Metadata> {
  const { ideaId } = await params;
  const idea = getIdea(ideaId);
  if (!idea) return { title: "Idea unavailable", robots: { index: false } };
  return {
    title: `${idea.id} — A half-baked idea`,
    description: idea.text,
    alternates: { canonical: `/idea/${idea.id}` },
    openGraph: {
      title: `${idea.id} · BONG`,
      description: idea.text,
      images: [
        `/idea/${idea.id}/opengraph-image?v=${getCorpusManifest().hash}-aqua-v1`,
      ],
    },
  };
}
export default async function IdeaPage({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;
  const status = getIdeaStatus(ideaId);
  if (status === "unknown") notFound();
  const idea = getIdea(ideaId);
  const community = communityEnabled();
  return (
    <section className="page narrow idea-page">
      <p className="eyebrow">A thought from the collection / {ideaId}</p>
      {status === "withdrawn" || !idea ? (
        <>
          <h1>This idea has been withdrawn.</h1>
          <p>It’s no longer part of the public collection.</p>
        </>
      ) : (
        <>
          <h1>A little food for thought.</h1>
          <div className="generator-card">
            <p className="result-meta">{getCategoryLabel(idea.categoryId)}</p>
            <p className="idea-text">{idea.text}</p>
            <IdeaActions idea={idea} communityEnabled={community} />
          </div>
          <p className="tiny">
            Entertainment, not instructions or professional advice.
          </p>
          <div className="form-actions">
            <Link href="/" className="button primary">
              Another idea
            </Link>
            {community && <ReportForm targetType="idea" targetId={idea.id} />}
          </div>
        </>
      )}
      {community && (
        <p className="notice">
          Discussing an idea starts a draft. Add your own title and thought
          before you submit it to the board.
        </p>
      )}
    </section>
  );
}
