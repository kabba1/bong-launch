"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
export function BoardPreview() {
  const [state, setState] = useState<
    "loading" | "empty" | "unavailable" | "loaded"
  >("loading");
  const [posts, setPosts] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/board/posts?limit=3", { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = await r.json();
        const list = Array.isArray(data.data)
          ? data.data
          : (data.data?.posts ?? []);
        setPosts(list.slice(0, 3));
        setState(list.length ? "loaded" : "empty");
      })
      .catch(() => {
        if (!abort.signal.aborted) setState("unavailable");
      });
    return () => abort.abort();
  }, []);
  return (
    <article className="explore-panel">
      <span className="panel-index">02 / THE BOARD</span>
      <h3>A thought worth sharing?</h3>
      {state === "unavailable" ? (
        <p>
          The board is temporarily unavailable. Your next idea is still just a
          click away.
        </p>
      ) : state === "loaded" ? (
        <ul>
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/board/${p.id}`}>{p.title}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {state === "loading"
            ? "See what people are thinking about, tinkering with, and making."
            : "No posts yet. Got a half-baked idea or something you’ve made?"}
        </p>
      )}
      <Link className="text-link" href="/board">
        Find your people <Icon name="arrow" size={18} />
      </Link>
    </article>
  );
}
