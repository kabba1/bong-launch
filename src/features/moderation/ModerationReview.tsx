"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { SessionAccess, useSession } from "@/features/auth/SessionAccess";
import { ModerationNavigation } from "./ModerationNavigation";
import type { ReviewAsset, ReviewItem, ReviewPost } from "./types";

function Media({ assets }: { assets: ReviewAsset[] }) {
  return assets.length > 0 ? (
    <div className="post-gallery">
      {assets.map((asset) => (
        <figure key={asset.id}>
          <img
            src={`/api/media/${asset.id}/main`}
            alt={asset.altText}
            width={asset.width}
            height={asset.height}
          />
          <figcaption>{asset.altText}</figcaption>
        </figure>
      ))}
    </div>
  ) : null;
}
function ProjectLink({ url }: { url?: string | null }) {
  if (!url) return null;
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }
  return target.protocol === "https:" &&
    !target.username &&
    !target.password ? (
    <p>
      <a href={url} target="_blank" rel="ugc nofollow noopener noreferrer">
        Project link · {target.hostname}
      </a>
    </p>
  ) : null;
}
function CandidatePost({ post }: { post: ReviewPost }) {
  const candidate = post.latestRevision;
  const sourceIdeaId = candidate ? candidate.sourceIdeaId : post.sourceIdeaId;
  return (
    <div className="flow">
      <section className="form-card">
        <p className="eyebrow">Exact submitted revision</p>
        <h2>{candidate?.title ?? post.title}</h2>
        <p className="post-body">{candidate?.body ?? post.body}</p>
        <ProjectLink url={candidate ? candidate.projectUrl : post.projectUrl} />
        <Media assets={candidate?.assets ?? post.assets} />
        {sourceIdeaId && (
          <p>
            <Link href={`/idea/${sourceIdeaId}`}>
              Open the referenced canned idea
            </Link>
          </p>
        )}
        <p className="tiny">
          Revision {candidate?.id ?? post.revisionId} ·{" "}
          {candidate?.state ?? post.state}
        </p>
      </section>
      {post.state === "published" &&
        candidate &&
        post.revisionId !== candidate.id && (
          <section className="form-card">
            <p className="eyebrow">
              Currently public · unchanged until approval
            </p>
            <h2>{post.title}</h2>
            <p className="post-body">{post.body}</p>
            <ProjectLink url={post.projectUrl} />
            <Media assets={post.assets} />
          </section>
        )}
    </div>
  );
}

function Review({ itemId, session }: { itemId: string; session: Session }) {
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [message, setMessage] = useState("");
  const feedback = useRef<HTMLDivElement>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setReview(
          (await api<ReviewItem>(`/moderation/review/${itemId}`, { signal }))
            .data,
        );
        setError(null);
      } catch (failure) {
        if (!(failure instanceof Error && failure.name === "AbortError"))
          setError(failure);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [itemId],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function decide(action: string) {
    if (!review || busy) return;
    const revisionId =
      review.targetType === "post"
        ? (review.item.latestRevision?.id ?? review.item.revisionId)
        : review.targetType === "comment"
          ? (review.item.latestRevision?.id ?? review.item.revisionId)
          : undefined;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await api("/moderation/decisions", {
        method: "POST",
        body: {
          targetType: review.targetType,
          id: review.item.id,
          ...(revisionId ? { revisionId } : {}),
          expectedVersion: review.item.version,
          action,
          reason,
          ...(privateNote ? { privateNote } : {}),
        },
      });
      setMessage(
        `${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : action === "hide" ? "Hidden" : action === "restore" ? "Restored" : action === "resolve" ? "Resolved" : "Escalated"} ${review.targetType} ${review.item.id}. The decision was saved.`,
      );
      setReason("");
      setPrivateNote("");
      await load();
    } catch (failure) {
      setError(failure);
      requestAnimationFrame(() => feedback.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p className="loading-line" role="status">
        Loading the exact review item…
      </p>
    );
  const pending =
    review &&
    review.targetType !== "report" &&
    !["hidden", "deleted"].includes(review.item.state) &&
    (review.item.latestRevision
      ? review.item.latestRevision.state === "pending"
      : review.item.state === "pending");
  const author =
    review && review.targetType !== "report" ? review.item.author : null;
  const selfImage =
    review?.targetType === "post" &&
    author?.id === session.user?.id &&
    (review.item.latestRevision?.assets ?? review.item.assets).length > 0;
  return (
    <div className="flow">
      <div ref={feedback} tabIndex={-1}>
        <Feedback error={error} />
      </div>
      <button
        className="button small quiet"
        disabled={busy}
        onClick={() => {
          setLoading(true);
          void load();
        }}
      >
        Reload current state
      </button>
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {review && (
        <>
          <div className="post-meta">
            <span className="badge">{review.targetType}</span>
            <span>Version {review.item.version}</span>
            {author?.id && (
              <Link href={`/moderation/members/${author.id}`}>
                Review member @{author.handle ?? "member"}
              </Link>
            )}
          </div>
          {review.targetType === "post" && <CandidatePost post={review.item} />}
          {review.targetType === "comment" && (
            <>
              <section className="form-card">
                <h2>Submitted comment</h2>
                <p className="post-body">
                  {review.item.latestRevision?.body ?? review.item.body}
                </p>
                {review.item.replyToHandle && (
                  <p className="tiny">
                    Replying to @{review.item.replyToHandle}
                  </p>
                )}
                <Link href={`/board/${review.item.postId}`}>
                  Open parent discussion
                </Link>
                <p className="tiny">
                  Revision{" "}
                  {review.item.latestRevision?.id ?? review.item.revisionId}
                </p>
              </section>
              {review.item.state === "published" &&
                review.item.latestRevision &&
                review.item.latestRevision.id !== review.item.revisionId && (
                  <section className="form-card">
                    <h2>Currently public comment</h2>
                    <p className="post-body">{review.item.body}</p>
                  </section>
                )}
            </>
          )}
          {review.targetType === "report" && (
            <section className="form-card flow">
              <h2>{review.item.reason.replaceAll("_", " ")}</h2>
              <p className="post-body">
                {review.item.detail || "No additional detail supplied."}
              </p>
              <p>
                Target: {review.item.targetType} · {review.item.targetId}
              </p>
              <span className="badge">{review.item.status}</span>
              {review.item.targetType === "post" && (
                <Link href={`/moderation/review/${review.item.targetId}`}>
                  Review the reported post
                </Link>
              )}
              {review.item.targetType === "comment" && (
                <Link href={`/moderation/review/${review.item.targetId}`}>
                  Review the reported comment
                </Link>
              )}
              {review.item.targetType === "member" && (
                <Link href={`/moderation/members/${review.item.targetId}`}>
                  Review the reported member
                </Link>
              )}
              {review.item.targetType === "idea" && (
                <Link href={`/idea/${review.item.targetId}`}>
                  Open the idea
                </Link>
              )}
              {review.item.targetType === "timeline" && (
                <Link href={`/through-time/${review.item.targetId}`}>
                  Open the timeline article
                </Link>
              )}
            </section>
          )}
          <section className="form-card">
            <h2>Record a decision</h2>
            <p className="tiny">
              The server checks your role, current MFA, exact revision and
              expected version. A changed item must be reloaded and reviewed
              again.
            </p>
            {selfImage && (
              <p className="notice">
                Another authorized staff member must approve your own image
                submission.
              </p>
            )}
            <div className="form-field">
              <label htmlFor="reason">Decision reason</label>
              <textarea
                id="reason"
                required
                minLength={3}
                maxLength={2000}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <small>
                3–1,000 characters. Rejection reasons can be shown to the
                author; keep confidential details in the private note.
              </small>
            </div>
            <div className="form-field">
              <label htmlFor="privateNote">
                Private staff note <span className="muted">(optional)</span>
              </label>
              <textarea
                id="privateNote"
                rows={3}
                maxLength={2000}
                value={privateNote}
                onChange={(event) => setPrivateNote(event.target.value)}
              />
              <small>
                Never include codes, tokens, or unnecessary personal
                information.
              </small>
            </div>
            <div className="form-actions">
              {(review.targetType === "report"
                ? ["resolve", "escalate"]
                : [
                    ...(pending ? ["approve", "reject"] : []),
                    ...(review.item.state === "published" ? ["hide"] : []),
                    ...(["hidden", "deleted"].includes(review.item.state)
                      ? ["restore"]
                      : []),
                  ]
              ).map((action) => (
                <button
                  key={action}
                  className={`button ${action === "approve" ? "primary" : "quiet"}`}
                  disabled={
                    busy ||
                    [...reason.trim()].length < 3 ||
                    [...reason.trim()].length > 1000 ||
                    [...privateNote.trim()].length > 1000 ||
                    (action === "approve" && selfImage)
                  }
                  onClick={() => void decide(action)}
                >
                  {busy
                    ? "Saving…"
                    : action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
            <p className="tiny">
              A resolved report records its disposition. It does not
              automatically remove the reported content.
            </p>
          </section>
        </>
      )}
      <Link className="text-link" href="/moderation">
        ← Back to queues
      </Link>
    </div>
  );
}

export function ModerationReview({ itemId }: { itemId: string }) {
  const state = useSession();
  return (
    <SessionAccess state={state} returnTo="/moderation" staff>
      {(session) => (
        <>
          <ModerationNavigation admin={session.role === "admin"} />
          <Review itemId={itemId} session={session} />
        </>
      )}
    </SessionAccess>
  );
}
