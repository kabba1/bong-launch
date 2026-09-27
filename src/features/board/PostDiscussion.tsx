"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ReportForm } from "./ReportForm";
import { type Post, type Comment, shortDate } from "./types";
import { canEditComment, canEditPost, canParticipate } from "./author-controls";
type Comments = {
  items?: Comment[];
  comments?: Comment[];
  page?: { nextCursor: string | null };
  nextCursor?: string | null;
};
export function CommentItem({
  comment,
  post,
  session,
  onChange,
  onReply,
  onNotice,
}: {
  comment: Comment;
  post: Post;
  session: Session | null;
  onChange: () => void | Promise<void>;
  onReply: (c: Comment) => void;
  onNotice?: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(
    comment.latestRevision?.body ?? comment.body ?? "",
  );
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const own = session?.user?.id === comment.authorId;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const editable = canEditComment(comment, post, session, now);
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/board/comments/${comment.id}`, {
        method: "DELETE",
        body: { expectedVersion: comment.version, confirmed: true },
      });
      onChange();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !canEditComment(comment, post, session, Date.now())) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api<{ state: "pending" | "published" }>(
        `/board/comments/${comment.id}`,
        {
          method: "PATCH",
          body: { body: text, expectedVersion: comment.version },
        },
      );
      onNotice?.(
        response.data.state === "published"
          ? "Your revised comment is published."
          : "Your revised comment is saved and waiting for review. The approved version remains public.",
      );
      setEditing(false);
      await onChange();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="comment" id={`comment-${comment.id}`}>
      <div className="post-meta">
        {comment.handle ? (
          <Link href={`/members/${comment.handle}`}>@{comment.handle}</Link>
        ) : (
          <span>Deleted member</span>
        )}
        <span>{shortDate(comment.createdAt)}</span>
        {comment.state !== "published" && (
          <span className="badge">{comment.state}</span>
        )}
      </div>
      {comment.replyToCommentId && (
        <small>
          Replying to{" "}
          {comment.replyToHandle
            ? `@${comment.replyToHandle}`
            : "an earlier comment"}
        </small>
      )}
      {comment.latestRevision &&
        ["pending", "rejected"].includes(comment.latestRevision.state) && (
          <details className="notice">
            <summary>
              {comment.latestRevision.state === "pending"
                ? "Your submitted comment is waiting for review"
                : "Your submitted comment was rejected"}
            </summary>
            <p>{comment.latestRevision.body}</p>
            {comment.latestRevision.authorReason && (
              <p>Review note: {comment.latestRevision.authorReason}</p>
            )}
            {comment.state === "published" && (
              <p className="tiny">The approved comment below remains public.</p>
            )}
          </details>
        )}
      {editing ? (
        <form onSubmit={save}>
          <div className="form-field">
            <label htmlFor={`edit-${comment.id}`}>Edit your comment</label>
            <textarea
              id={`edit-${comment.id}`}
              required
              minLength={1}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              className="button small primary"
              disabled={busy || !editable}
            >
              Submit revision
            </button>
            <button
              type="button"
              className="button small quiet"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {!editable && (
            <p className="notice">
              The edit window or your permission to edit has ended. Your text is
              kept here.
            </p>
          )}
        </form>
      ) : (
        <p>{comment.body ?? "This comment has been removed."}</p>
      )}
      <div className="result-tools">
        {comment.state === "published" &&
          post.state === "published" &&
          canParticipate(session) && (
            <button className="tool-button" onClick={() => onReply(comment)}>
              Reply
            </button>
          )}
        {own && comment.state !== "deleted" && canParticipate(session) && (
          <>
            {editable && (
              <button className="tool-button" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            <ConfirmDialog
              label="Delete"
              title="Delete your comment?"
              onConfirm={remove}
              disabled={busy}
            >
              <p>
                The comment text will be removed. A blank marker may remain so
                replies still make sense.
              </p>
            </ConfirmDialog>
          </>
        )}
        {comment.state === "published" && (
          <ReportForm targetType="comment" targetId={comment.id} />
        )}
      </div>
      <Feedback error={error} />
      <span className="sr-only">On post {post.id}</span>
    </article>
  );
}
export function PostDiscussion({ post }: { post: Post }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const [notice, setNotice] = useState("");
  const [deleted, setDeleted] = useState(false);
  const load = useCallback(
    async (next: string | null = null) => {
      await Promise.resolve();
      setLoading(true);
      setError(null);
      try {
        const r = await api<Comments | Comment[]>(
          `/board/posts/${post.id}/comments${next ? `?cursor=${encodeURIComponent(next)}` : ""}`,
        );
        const data = Array.isArray(r.data)
          ? r.data
          : (r.data.items ?? r.data.comments ?? []);
        setComments((old) => (next ? [...old, ...data] : data));
        setCursor(
          r.page?.nextCursor ??
            (!Array.isArray(r.data)
              ? (r.data.nextCursor ?? r.data.page?.nextCursor)
              : null) ??
            null,
        );
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [post.id],
  );
  useEffect(() => {
    queueMicrotask(() => void load());
    api<Session>("/session")
      .then((r) => setSession(r.data))
      .catch(setError);
    queueMicrotask(() => setKey(crypto.randomUUID()));
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const r = await api<{ state?: string; status?: string }>(
        `/board/posts/${post.id}/comments`,
        {
          method: "POST",
          body: {
            body,
            replyToCommentId: reply?.id ?? null,
            idempotencyKey: key,
          },
        },
      );
      setNotice(
        r.data.state === "published" || r.data.status === "published"
          ? "Your reply is published."
          : "Your reply is saved and waiting for review.",
      );
      setBody("");
      setReply(null);
      setKey(crypto.randomUUID());
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function removePost() {
    setBusy(true);
    try {
      await api(`/board/posts/${post.id}`, {
        method: "DELETE",
        body: { expectedVersion: post.version, confirmed: true },
      });
      setDeleted(true);
      router.push("/board");
      router.refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const own = session?.user?.id === post.authorId;
  return (
    <>
      {own && post.state !== "deleted" && canParticipate(session) && (
        <div className="form-actions">
          {canEditPost(post, session) && (
            <Link
              href={`/board/${post.id}/edit`}
              className="button small quiet"
            >
              Edit your thought
            </Link>
          )}
          <ConfirmDialog
            label="Delete this post"
            title={`Delete “${post.title}”?`}
            onConfirm={removePost}
            disabled={busy || deleted}
          >
            <p>
              This removes the post, images, and its discussion from public
              view. There is no self-service restore.
            </p>
          </ConfirmDialog>
        </div>
      )}
      <section className="comments" aria-label="Discussion">
        <h2>The conversation.</h2>
        {loading && !comments.length ? (
          <p className="loading-line">Loading replies…</p>
        ) : !comments.length && !error ? (
          <p className="notice">
            No replies yet. A fresh perspective is welcome.
          </p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={`${c.id}-${c.version}`}
              comment={c}
              post={post}
              session={session}
              onChange={() => load()}
              onReply={setReply}
              onNotice={setNotice}
            />
          ))
        )}
        {cursor && (
          <button
            className="button quiet"
            disabled={loading}
            onClick={() => load(cursor)}
          >
            Load more comments
          </button>
        )}
        <Feedback error={error} />
        {notice && (
          <p className="notice success" role="status">
            {notice}
          </p>
        )}
        {canParticipate(session) && post.state === "published" ? (
          <form onSubmit={submit} className="form-card flow">
            {reply && (
              <p>
                Replying to @{reply.handle}{" "}
                <button
                  className="tool-button"
                  type="button"
                  onClick={() => setReply(null)}
                >
                  Cancel reply
                </button>
              </p>
            )}
            <div className="form-field">
              <label htmlFor="reply">Add your thought</label>
              <textarea
                id="reply"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                required
                minLength={1}
              />
              <small>Keep it human. Up to 2,000 characters; plain text.</small>
            </div>
            <button className="button primary" disabled={busy}>
              {busy ? "Submitting…" : "Post a reply"}
            </button>
          </form>
        ) : (
          <p className="notice">
            {session?.user ? (
              "Comments are currently unavailable for this account or post."
            ) : (
              <>
                <Link
                  href={`/sign-in?returnTo=${encodeURIComponent(`/board/${post.id}`)}`}
                >
                  Sign in
                </Link>{" "}
                to join the conversation.
              </>
            )}
          </p>
        )}
      </section>
    </>
  );
}
