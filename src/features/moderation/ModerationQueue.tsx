"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { SessionAccess, useSession } from "@/features/auth/SessionAccess";
import { ModerationNavigation } from "./ModerationNavigation";
import type { ReviewQueue, ReviewPost, ReviewComment } from "./types";

function Queue() {
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tab, setTab] = useState<"pending" | "reports" | "members">("pending");
  const [memberId, setMemberId] = useState("");
  const load = useCallback(async (cursor?: string, signal?: AbortSignal) => {
    try {
      const result = await api<ReviewQueue>(
        `/moderation/queue?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        { signal },
      );
      setQueue((previous) =>
        previous && cursor
          ? {
              ...result.data,
              items: [...previous.items, ...result.data.items],
              posts: [...previous.posts, ...result.data.posts],
              comments: [...previous.comments, ...result.data.comments],
              reports: [...previous.reports, ...result.data.reports],
            }
          : result.data,
      );
      setError(null);
    } catch (failure) {
      if (!(failure instanceof Error && failure.name === "AbortError"))
        setError(failure);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(undefined, controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  const authors = queue
    ? [
        ...new Map(
          [...queue.posts, ...queue.comments]
            .filter((item) => item.author.id)
            .map((item) => [item.author.id, item.author]),
        ).values(),
      ]
    : [];
  const next = queue?.page?.nextCursor ?? queue?.nextCursor;
  function pendingCard(entry: ReviewQueue["items"][number]) {
    if (entry.targetType === "post") {
      const post = entry.item as ReviewPost;
      return (
        <article className="post-card" key={post.id}>
          <div>
            <span className="badge">
              Post · {post.latestRevision?.state ?? post.state}
            </span>
            <h2>
              <Link href={`/moderation/review/${post.id}`}>
                {post.latestRevision?.title ?? post.title}
              </Link>
            </h2>
            <p>{(post.latestRevision?.body ?? post.body).slice(0, 220)}</p>
            <div className="post-meta">
              {post.author.id && (
                <Link href={`/moderation/members/${post.author.id}`}>
                  @{post.author.handle ?? "member"}
                </Link>
              )}
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
              <span>
                {(post.latestRevision?.assets ?? post.assets).length} images
              </span>
            </div>
          </div>
          <Link
            className="button small quiet"
            href={`/moderation/review/${post.id}`}
          >
            Review
          </Link>
        </article>
      );
    }
    const comment = entry.item as ReviewComment;
    return (
      <article className="post-card" key={comment.id}>
        <div>
          <span className="badge">
            Comment · {comment.latestRevision?.state ?? comment.state}
          </span>
          <p>{(comment.latestRevision?.body ?? comment.body).slice(0, 220)}</p>
          <div className="post-meta">
            {comment.author.id && (
              <Link href={`/moderation/members/${comment.author.id}`}>
                @{comment.author.handle ?? "member"}
              </Link>
            )}
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <Link
          className="button small quiet"
          href={`/moderation/review/${comment.id}`}
        >
          Review
        </Link>
      </article>
    );
  }
  return (
    <div className="flow">
      <div className="page-toolbar">
        <div className="filters" aria-label="Moderation views">
          <button
            aria-pressed={tab === "pending"}
            onClick={() => setTab("pending")}
          >
            Pending submissions
            {queue ? ` (${queue.counts.posts + queue.counts.comments})` : ""}
          </button>
          <button
            aria-pressed={tab === "reports"}
            onClick={() => setTab("reports")}
          >
            Reports{queue ? ` (${queue.counts.reports})` : ""}
          </button>
          <button
            aria-pressed={tab === "members"}
            onClick={() => setTab("members")}
          >
            Members
          </button>
        </div>
        <button
          className="button small quiet"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Refresh queue
        </button>
      </div>
      <Feedback error={error} />
      {loading && !queue && (
        <p className="loading-line" role="status">
          Loading authorized review items…
        </p>
      )}
      {queue && tab === "pending" && (
        <>
          {queue.posts.length + queue.comments.length === 0 ? (
            <section className="empty-state">
              <h2>
                {queue.counts.posts + queue.counts.comments === 0
                  ? "No pending submissions"
                  : "No submissions on this loaded page"}
              </h2>
              <p>
                {queue.counts.posts + queue.counts.comments === 0
                  ? "The current queue has no submissions waiting for your review."
                  : "Higher-priority reports occupy this page. Use Load more to reach the remaining submissions."}
              </p>
            </section>
          ) : (
            <div className="post-list">
              {queue.items
                .filter((entry) => entry.targetType !== "report")
                .map(pendingCard)}
            </div>
          )}
        </>
      )}
      {queue && tab === "reports" && (
        <>
          {queue.reports.length === 0 ? (
            <section className="empty-state">
              <h2>
                {queue.counts.reports === 0
                  ? "No unresolved reports"
                  : "No reports on this loaded page"}
              </h2>
              <p>
                {queue.counts.reports === 0
                  ? "No reports are waiting in this queue."
                  : "Use Load more to reach the remaining review items."}
              </p>
            </section>
          ) : (
            <div className="job-list">
              {queue.reports.map((report) => (
                <article className="job-item" key={report.id}>
                  <span className="badge">{report.status}</span>
                  <h3>{report.reason.replaceAll("_", " ")}</h3>
                  <p>{report.detail || "No additional detail supplied."}</p>
                  <p className="tiny">
                    Target: {report.targetType} · {report.targetId}
                  </p>
                  <p className="tiny">
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                  <Link
                    className="button small quiet"
                    href={`/moderation/review/${report.id}`}
                  >
                    Review report
                  </Link>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {tab === "members" && (
        <section className="flow">
          <h2>Member review</h2>
          <p>
            Open a contributor from a review item, or use a known member ID.
            Status changes never grant staff roles.
          </p>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (/^[0-9a-f-]{36}$/i.test(memberId))
                router.push(`/moderation/members/${memberId}`);
            }}
          >
            <label className="sr-only" htmlFor="memberId">
              Member ID
            </label>
            <input
              id="memberId"
              className="search-input"
              placeholder="Member UUID"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              required
              pattern="[0-9a-fA-F-]{36}"
            />
            <button className="button quiet">Open member</button>
          </form>
          <div className="job-list">
            {authors.map((author) => (
              <article className="job-item" key={author.id}>
                <Link href={`/moderation/members/${author.id}`}>
                  @{author.handle ?? "member"}
                  {author.displayName ? ` · ${author.displayName}` : ""}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
      {next && tab !== "members" && (
        <button
          className="button quiet"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load(next);
          }}
        >
          {loading ? "Loading…" : "Load more queue items"}
        </button>
      )}
      <p className="tiny">
        A report is a request for review, not a vote to remove content. Check
        the exact revision before deciding.
      </p>
    </div>
  );
}

export function ModerationQueue() {
  const state = useSession();
  return (
    <SessionAccess state={state} returnTo="/moderation" staff>
      {(session) => (
        <>
          <ModerationNavigation admin={session.role === "admin"} />
          <Queue />
        </>
      )}
    </SessionAccess>
  );
}
