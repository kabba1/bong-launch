"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SessionAccess, useSession } from "@/features/auth/SessionAccess";

interface Contribution {
  id: string;
  postId?: string;
  title?: string;
  body: string;
  state: string;
  version: number;
  createdAt: string;
  latestRevision?: {
    title?: string;
    body?: string;
    state: string;
    authorReason?: string | null;
  };
  authorReason?: string | null;
}
interface OwnContent {
  items: Contribution[];
  comments: Contribution[];
  page?: { nextCursor: string | null; hasMore: boolean };
}

function ProfileEditor({
  session,
  refresh,
}: {
  session: Session;
  refresh: () => Promise<void>;
}) {
  const member = session.member!;
  const [displayName, setDisplayName] = useState(
    member.displayName ?? member.display_name ?? member.handle,
  );
  const [bio, setBio] = useState(member.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api("/account/profile", {
        method: "PATCH",
        body: { displayName, bio, expectedVersion: member.version },
      });
      setSaved(true);
      await refresh();
    } catch (failure) {
      setError(failure);
      requestAnimationFrame(() => feedback.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  const active = !member.state || member.state === "active";
  return (
    <form className="form-card" onSubmit={save}>
      <h2>Your public profile</h2>
      <p className="muted">
        Your handle is{" "}
        <Link href={`/members/${member.handle}`}>@{member.handle}</Link>.
        Handles stay the same after joining.
      </p>
      <div ref={feedback} tabIndex={-1}>
        <Feedback error={error} />
      </div>
      {saved && (
        <p className="notice success" role="status">
          Your profile was saved.
        </p>
      )}
      {!active && (
        <p className="notice">
          Your account is {member.state}. Profile changes and community
          submissions are unavailable. You can still use the security and
          data-request pages.
        </p>
      )}
      <div className="form-field">
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          required
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <small>1–40 characters. Public on your contributions.</small>
      </div>
      <div className="form-field">
        <label htmlFor="bio">
          A little about you <span className="muted">(optional)</span>
        </label>
        <textarea
          id="bio"
          maxLength={480}
          rows={3}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
        <small>
          {[...bio].length}/240 characters. Keep private contact details out of
          your public profile.
        </small>
      </div>
      <button
        className="button primary"
        disabled={
          busy ||
          !active ||
          !displayName.trim() ||
          [...displayName].length > 40 ||
          [...bio].length > 240
        }
        type="submit"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function OwnContributions() {
  const [filter, setFilter] = useState("");
  const [content, setContent] = useState<OwnContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(
    async (cursor?: string, signal?: AbortSignal) => {
      setLoading(true);
      const query = new URLSearchParams({ limit: "20" });
      if (filter) query.set("state", filter);
      if (cursor) query.set("cursor", cursor);
      try {
        const result = await api<OwnContent>(`/account/content?${query}`, {
          signal,
        });
        setError(null);
        setContent((previous) =>
          cursor && previous
            ? {
                ...result.data,
                items: [...previous.items, ...result.data.items],
                comments: [...previous.comments, ...result.data.comments],
              }
            : result.data,
        );
      } catch (failure) {
        if (!(failure instanceof Error && failure.name === "AbortError"))
          setError(failure);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filter],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(undefined, controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function remove(item: Contribution, comment: boolean) {
    setBusy(item.id);
    setError(null);
    setMessage("");
    try {
      await api(`/board/${comment ? "comments" : "posts"}/${item.id}`, {
        method: "DELETE",
        body: { expectedVersion: item.version, confirmed: true },
      });
      setMessage(`${comment ? "Comment" : "Post"} removed.`);
      await load();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(null);
    }
  }
  function renderItem(item: Contribution, comment: boolean) {
    const status =
      item.latestRevision?.state === "pending"
        ? item.state === "published"
          ? "Pending edit"
          : "Pending review"
        : item.latestRevision?.state === "rejected"
          ? item.state === "published"
            ? "Edit rejected"
            : "Rejected"
          : item.state;
    const reason = item.latestRevision?.authorReason || item.authorReason;
    return (
      <article
        className="job-item"
        key={`${comment ? "comment" : "post"}-${item.id}`}
      >
        <span className="badge">{status}</span>
        {comment ? (
          <>
            <p className="post-body">
              {item.latestRevision?.body ?? item.body}
            </p>
            <Link href={`/board/${item.postId}`}>View discussion</Link>
          </>
        ) : (
          <h3>
            <Link href={`/board/${item.id}`}>
              {item.latestRevision?.title || item.title || "Your post"}
            </Link>
          </h3>
        )}
        {reason && <p className="notice">Review note: {reason}</p>}
        <div className="form-actions">
          {!comment && !["hidden", "deleted"].includes(item.state) && (
            <Link
              className="button small quiet"
              href={`/board/${item.id}/edit`}
            >
              Edit post
            </Link>
          )}
          {item.state !== "deleted" && (
            <ConfirmDialog
              label={
                busy === item.id
                  ? "Removing…"
                  : comment
                    ? "Delete comment"
                    : "Delete post"
              }
              title={comment ? "Delete this comment?" : "Delete this post?"}
              disabled={!!busy}
              onConfirm={() => void remove(item, comment)}
            >
              <p>
                This removes your{" "}
                {comment ? "comment text" : "post and its media"} from public
                view. There is no member restore option.
              </p>
            </ConfirmDialog>
          )}
        </div>
      </article>
    );
  }
  return (
    <section className="flow">
      <div className="section-header">
        <div>
          <p className="eyebrow">Your corner of the board</p>
          <h2>Contributions</h2>
        </div>
        <Link className="text-link" href="/board/new">
          Start a post →
        </Link>
      </div>
      <div className="filters" aria-label="Filter your contributions">
        {[
          ["", "All"],
          ["published", "Published"],
          ["pending", "Pending"],
          ["rejected", "Rejected"],
          ["hidden", "Hidden"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            onClick={() => {
              if (filter !== value) {
                setContent(null);
                setLoading(true);
                setFilter(value!);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Feedback error={error} />
      {!!error && (
        <button className="button quiet" onClick={() => void load()}>
          Try again
        </button>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {loading && !content && (
        <p className="loading-line" role="status">
          Loading your contributions…
        </p>
      )}
      {content && (
        <>
          {content.items.length === 0 && content.comments.length === 0 ? (
            <div className="empty-state">
              <h3>No contributions in this view</h3>
              <p>
                Your real posts and comments will appear here, including items
                waiting for review.
              </p>
            </div>
          ) : (
            <div className="job-list">
              {content.items.map((item) => renderItem(item, false))}
              {content.comments.map((item) => renderItem(item, true))}
            </div>
          )}
          {content.page?.hasMore && content.page.nextCursor && (
            <button
              className="button quiet"
              disabled={loading}
              onClick={() => void load(content.page!.nextCursor!)}
            >
              {loading ? "Loading…" : "Load more contributions"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function AccountHome() {
  const state = useSession();
  return (
    <SessionAccess state={state} returnTo="/account">
      {(session) =>
        !session.onboarded || !session.member ? (
          <section className="empty-state">
            <h2>Finish your introduction</h2>
            <p>
              Choose a handle and review the participation policies before
              joining the board.
            </p>
            <Link className="button primary" href="/onboarding">
              Set up your profile
            </Link>
            <p>
              <Link href="/account/security">Security and sign out</Link> ·{" "}
              <Link href="/account/data">Your data</Link>
            </p>
          </section>
        ) : (
          <div className="flow">
            {session.role && (
              <p className="notice">
                Your staff role: {session.role}.{" "}
                <Link href="/moderation">Open moderation</Link>
                {session.role === "admin" && (
                  <>
                    {" "}
                    · <Link href="/admin/audit">Audit history</Link>
                  </>
                )}
              </p>
            )}
            <ProfileEditor session={session} refresh={() => state.refresh()} />
            <OwnContributions />
          </div>
        )
      }
    </SessionAccess>
  );
}
