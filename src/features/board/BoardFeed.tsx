"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { PostCard } from "./PostCard";
import type { Post } from "./types";
type Feed = {
  posts: Post[];
  nextCursor?: string | null;
  page?: { nextCursor: string | null };
};
export function BoardFeed({
  initialKind = "",
  initialQuery = "",
  initialCursor = null,
}: {
  initialKind?: string;
  initialQuery?: string;
  initialCursor?: string | null;
}) {
  const [kind, setKind] = useState(initialKind);
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<unknown>();
  const [retry, setRetry] = useState(0);
  const firstLoad = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(
    async (next: string | null, append = false, signal?: AbortSignal) => {
      await Promise.resolve();
      if (signal?.aborted) return;
      setBusy(true);
      setError(null);
      const params = new URLSearchParams();
      if (kind) params.set("kind", kind);
      if (debounced.length >= 2) params.set("query", debounced);
      if (next) params.set("cursor", next);
      try {
        const result = await api<Feed | Post[]>(`/board/posts?${params}`, {
          signal,
        });
        if (signal?.aborted) return;
        const items = Array.isArray(result.data)
          ? result.data
          : result.data.posts;
        setPosts((old) => (append ? [...old, ...items] : items));
        setCursor(
          result.page?.nextCursor ??
            (!Array.isArray(result.data)
              ? (result.data.nextCursor ?? result.data.page?.nextCursor)
              : null) ??
            null,
        );
        window.history.replaceState(
          null,
          "",
          `/board${params.size ? "?" + params : ""}`,
        );
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) setError(e);
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [kind, debounced],
  );
  useEffect(() => {
    const abort = new AbortController();
    queueMicrotask(() => {
      if (abort.signal.aborted) return;
      const next = firstLoad.current ? initialCursor : null;
      firstLoad.current = false;
      void load(next, false, abort.signal);
    });
    return () => abort.abort();
  }, [load, retry, initialCursor]);
  return (
    <>
      <div className="page-toolbar">
        <div className="filters" aria-label="Post kind">
          {[
            ["", "All thoughts"],
            ["hear_me_out", "Hear me out"],
            ["made_this", "Made this"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-form">
          <label htmlFor="board-search" className="sr-only">
            Search published posts
          </label>
          <input
            className="search-input"
            id="board-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={100}
            placeholder="Find a thought…"
          />
        </div>
      </div>
      {error ? (
        <>
          <Feedback error={error} />
          <button
            className="button quiet"
            onClick={() => setRetry((x) => x + 1)}
          >
            Try loading the board again
          </button>
        </>
      ) : busy && !posts.length ? (
        <p className="loading-line" role="status">
          Loading the board…
        </p>
      ) : !posts.length ? (
        <div className="empty-state">
          <p className="eyebrow">There’s room for your idea</p>
          <h2>
            {query || kind
              ? "No thoughts here just yet."
              : "Somebody has to go first."}
          </h2>
          <p>
            {query || kind
              ? "Try a different search or see all the conversations."
              : "No posts yet. Got a half-baked idea or something you’ve made? This is a good place to start."}
          </p>
          {query || kind ? (
            <button
              className="button quiet"
              onClick={() => {
                setQuery("");
                setKind("");
              }}
            >
              Reset filters
            </button>
          ) : (
            <Link className="button primary" href="/board/new">
              Share a thought
            </Link>
          )}
        </div>
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      {cursor && !error && (
        <div className="form-actions">
          <button
            className="button quiet"
            disabled={busy}
            onClick={() => load(cursor, true)}
          >
            {busy ? "Loading…" : "Load more thoughts"}
          </button>
        </div>
      )}
    </>
  );
}
