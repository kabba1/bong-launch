"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { loadCorpus } from "./corpus";
import { createDeck, drawNext, restoreDeck } from "./deck";
import type { Corpus, CorpusManifest, Idea } from "./types";
import type { DeckState } from "./deck";
import { IdeaActions } from "./IdeaActions";
const KEY = "bong:deck:v1";
export function Generator({
  communityEnabled = false,
}: {
  communityEnabled?: boolean;
}) {
  const [loaded, setLoaded] = useState<{
    corpus: Corpus;
    manifest: CorpusManifest;
  } | null>(null);
  const [failure, setFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const state = useRef<DeckState | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const memoryOnly = useRef(false);
  useEffect(() => {
    alive.current = true;
    loadCorpus()
      .then((data) => {
        if (!alive.current) return;
        const ids = data.corpus.ideas.map((i) => i.id);
        let saved: DeckState | null = null;
        try {
          saved = restoreDeck(
            localStorage.getItem(KEY),
            ids,
            data.manifest.hash,
          );
        } catch {
          memoryOnly.current = true;
          setStorageOk(false);
        }
        state.current = saved ?? createDeck(ids, data.manifest.hash);
        setHistory(state.current.history);
        setLoaded(data);
        setFailure(false);
      })
      .catch(() => {
        if (alive.current) setFailure(true);
      });
    return () => {
      alive.current = false;
    };
  }, [attempt]);
  useEffect(() => {
    const reconcile = (event: StorageEvent) => {
      if (
        event.key !== KEY ||
        !loaded ||
        inFlight.current ||
        memoryOnly.current
      )
        return;
      const fresh = restoreDeck(
        event.newValue,
        loaded.corpus.ideas.map((i) => i.id),
        loaded.manifest.hash,
      );
      if (
        fresh &&
        (!state.current || fresh.updatedAt >= state.current.updatedAt)
      ) {
        state.current = fresh;
        setHistory(fresh.history);
      }
    };
    window.addEventListener("storage", reconcile);
    return () => window.removeEventListener("storage", reconcile);
  }, [loaded]);
  const generate = useCallback(async () => {
    if (!loaded || inFlight.current || !state.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const draw = () => {
        const ids = loaded.corpus.ideas.map((i) => i.id);
        let current = state.current!;
        try {
          const saved = memoryOnly.current
            ? null
            : restoreDeck(localStorage.getItem(KEY), ids, loaded.manifest.hash);
          if (saved && saved.updatedAt >= current.updatedAt) current = saved;
        } catch {
          memoryOnly.current = true;
          setStorageOk(false);
        }
        const next = drawNext(current, ids, loaded.manifest.hash);
        state.current = next.state;
        try {
          if (!memoryOnly.current)
            localStorage.setItem(KEY, JSON.stringify(next.state));
        } catch {
          memoryOnly.current = true;
          setStorageOk(false);
        }
        return {
          next: loaded.corpus.ideas.find((i) => i.id === next.id),
          history: next.state.history,
        };
      };
      const result = navigator.locks
        ? await navigator.locks.request("bong-deck-draw", draw)
        : draw();
      if (result.next) {
        setIdea(result.next);
        setHistory(result.history);
      }
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        await new Promise((r) => setTimeout(r, 350));
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }, [loaded]);
  const art = (mobile = false) => (
    <figure className={mobile ? "mobile-art" : "art-figure desktop-art"}>
      <div className="art-frame">
        <button
          className={`art-button ${busy ? "revealing" : ""}`}
          onClick={generate}
          disabled={!loaded || busy}
          aria-label="Click the bong for an idea"
        >
          <img
            src="/images/bong-800.webp"
            srcSet="/images/bong-480.webp 480w, /images/bong-800.webp 800w, /images/bong-1254.webp 1254w"
            sizes={mobile ? "180px" : "(max-width: 760px) 180px, 42vw"}
            width="1254"
            height="1254"
            alt="The BONG glass bong illustration on its original orange background"
            fetchPriority={mobile ? "auto" : "high"}
          />
        </button>
      </div>
      <div className="art-stamp">
        100%
        <br />
        HALF-BAKED
        <br />
        <Icon name="spark" size={15} />
      </div>
      {!mobile && (
        <>
          <figcaption className="art-caption">
            <span>The original thought experiment</span>
            <span>↖ Go on. Give it a click.</span>
          </figcaption>
          <p className="art-note">
            <Icon name="spark" size={17} />
            <span>No prompt. No account. Just a little curiosity.</span>
          </p>
        </>
      )}
    </figure>
  );
  const category = loaded?.corpus.categories.find(
    (c) => c.id === idea?.categoryId,
  )?.label;
  return (
    <section className="container hero" aria-label="The idea generator">
      <div className="hero-topline">
        <p className="eyebrow">
          <Icon name="spark" size={15} /> A home for half-baked ideas
        </p>
        <span className="tiny">A little ridiculous. A little possibility.</span>
      </div>
      <div className="hero-grid">
        <div className="hero-copy">
          <h1>
            Some ideas change
            <br />
            the world.
            <br />
            Some just{" "}
            <span className="highlight">
              sound
              <br />
              good at the time.
            </span>
          </h1>
          <p className="hero-intro">
            One bong. A thousand unexpected thoughts.
            <br />
            See what comes out of this one.
          </p>
          {art(true)}
          <div className="generator-actions">
            {failure ? (
              <button
                className="button primary"
                onClick={() => {
                  setFailure(false);
                  setAttempt((a) => a + 1);
                }}
              >
                Try loading the ideas again
              </button>
            ) : (
              <button
                className="button primary"
                onClick={generate}
                disabled={!loaded || busy}
              >
                <Icon name="spark" size={20} />
                {!loaded
                  ? "Loading the ideas…"
                  : idea
                    ? "Another idea"
                    : "Give me an idea"}
                <Icon name="arrow" size={20} />
              </button>
            )}
            <span className="tiny">No overthinking required.</span>
          </div>
          <div className="generator-card">
            <div aria-live="polite" aria-atomic="true">
              {idea ? (
                <div data-idea-id={idea.id}>
                  <div className="result-meta">
                    <span>{category}</span>
                    <span>{idea.id}</span>
                  </div>
                  <p className="idea-text">{idea.text}</p>
                </div>
              ) : (
                <>
                  <div className="result-meta">
                    <span>Your next thought</span>
                    <Icon name="spark" size={14} />
                  </div>
                  <p className="idea-text empty-thought">
                    {failure
                      ? "The ideas couldn’t load. Give it another try."
                      : "Something brilliant? Something ridiculous? Only one way to find out."}
                  </p>
                </>
              )}
            </div>
            {idea ? (
              <IdeaActions idea={idea} communityEnabled={communityEnabled} />
            ) : (
              <p className="status-message">
                {failure
                  ? "The rest of the site is still here."
                  : "A curated collection. No live AI. No promises of genius."}
              </p>
            )}
          </div>
          {!storageOk && (
            <p className="storage-note">
              Your browser isn’t saving progress. You can keep generating in
              this tab.
            </p>
          )}
          {history.length > 0 && loaded && (
            <details className="recent-ideas">
              <summary>Recent ideas</summary>
              <ol>
                {[...history].reverse().map((id, index) => {
                  const item = loaded.corpus.ideas.find((i) => i.id === id);
                  return item ? (
                    <li key={`${id}-${index}`}>
                      <button onClick={() => setIdea(item)}>
                        <span>{id}</span>
                        {item.text}
                      </button>
                    </li>
                  ) : null;
                })}
              </ol>
            </details>
          )}
          <noscript>
            <p>
              The random button needs JavaScript. Read{" "}
              <Link href="/idea/BONG-0001">idea 1</Link>,{" "}
              <Link href="/idea/BONG-0284">idea 284</Link>, or{" "}
              <Link href="/idea/BONG-0792">idea 792</Link> instead.
            </p>
          </noscript>
        </div>
        {art()}
      </div>
    </section>
  );
}
