import Link from "next/link";
import { notFound } from "next/navigation";
import { pageData, missing } from "@/lib/page-data";
import {
  type Post,
  type PostRevision,
  shortDate,
} from "@/features/board/types";
import { PostDiscussion } from "@/features/board/PostDiscussion";
import { ReportForm } from "@/features/board/ReportForm";
import { getIdea } from "@/server/content";
import {
  SessionRecovery,
  ClearSessionRecovery,
} from "@/features/auth/SessionRecovery";
export const metadata = {
  title: "A thought on the Board",
  robots: { index: false, follow: true },
};
function RevisionContent({
  revision,
}: {
  revision: Pick<
    PostRevision,
    "body" | "sourceIdeaId" | "projectUrl" | "assets"
  >;
}) {
  const source = revision.sourceIdeaId
    ? getIdea(revision.sourceIdeaId)
    : undefined;
  return (
    <div className="flow">
      <p className="post-body">{revision.body}</p>
      {revision.sourceIdeaId && (
        <aside className="source-quote">
          <span className="eyebrow">Inspired by {revision.sourceIdeaId}</span>
          {source && <p>{source.text}</p>}
          <Link href={`/idea/${revision.sourceIdeaId}`} className="tiny">
            View the source idea
          </Link>
        </aside>
      )}
      {revision.projectUrl && (
        <a
          className="button quiet"
          href={revision.projectUrl}
          target="_blank"
          rel="ugc nofollow noopener noreferrer"
        >
          {new URL(revision.projectUrl).hostname} ↗
        </a>
      )}
      {!!revision.assets?.length && (
        <div className="post-gallery">
          {revision.assets.map((asset) => (
            <figure key={asset.id}>
              <a
                href={`/api/media/${asset.id}/main`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`/api/media/${asset.id}/main`}
                  width={asset.width}
                  height={asset.height}
                  alt={asset.altText}
                />
              </a>
              <figcaption>{asset.altText}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { postId } = await params;
  const recoveryAttempted = (await searchParams)?.authRecovery === "1";
  if (!/^[0-9a-f-]{36}$/i.test(postId)) notFound();
  let post: Post;
  try {
    post = await pageData<Post>("post.get", { id: postId });
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      e.code === "SESSION_RECOVERY_REQUIRED"
    ) {
      if (recoveryAttempted) notFound();
      return <SessionRecovery path={`/board/${postId}`} />;
    }
    if (missing(e)) notFound();
    return (
      <section className="page narrow">
        <h1>A small interruption.</h1>
        <p className="notice">
          The board is temporarily unavailable. Your post hasn’t been changed.
        </p>
        <Link href={`/board/${postId}`} className="button quiet">
          Try again
        </Link>
      </section>
    );
  }
  const candidate = post.latestRevision ?? post.pendingRevision;
  const privateEdit =
    post.state === "published" &&
    candidate &&
    ["pending", "rejected"].includes(candidate.state)
      ? candidate
      : null;
  return (
    <article className="page narrow post-detail">
      {recoveryAttempted && <ClearSessionRecovery />}
      <Link className="text-link" href="/board">
        ← The Board
      </Link>
      <p className="eyebrow">
        {post.kind === "made_this" ? "Made this" : "Hear me out"}
      </p>
      <h1>{post.title}</h1>
      <div className="post-meta">
        <Link href={`/members/${post.handle}`}>
          {post.displayName} @{post.handle}
        </Link>
        <span>{shortDate(post.publishedAt ?? post.createdAt)}</span>
        {post.version > 1 && <span>Edited</span>}
      </div>
      {post.state !== "published" && (
        <p className="notice">
          {post.latestRevision?.state === "rejected"
            ? "This submission was rejected."
            : `This post is ${post.state}.`}{" "}
          This private view is only available to its author and authorized
          reviewers.
        </p>
      )}
      {privateEdit && (
        <details className="notice">
          <summary>
            {privateEdit.state === "pending"
              ? "A new revision is waiting for review"
              : "Your latest revision was rejected"}
          </summary>
          <h2>{privateEdit.title}</h2>
          <RevisionContent revision={privateEdit} />
          {"authorReason" in privateEdit && privateEdit.authorReason && (
            <p>Review note: {privateEdit.authorReason}</p>
          )}
          <p className="tiny">The approved version below remains public.</p>
        </details>
      )}
      <div className="flow">
        <RevisionContent revision={post} />
        {post.state !== "published" && post.latestRevision?.authorReason && (
          <p className="notice">
            Review note: {post.latestRevision.authorReason}
          </p>
        )}
        {post.state === "published" && (
          <ReportForm targetType="post" targetId={post.id} />
        )}
      </div>
      <PostDiscussion post={post} />
    </article>
  );
}
