"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { loadCorpus } from "./corpus";
import { createDeck, drawNext, restoreDeck } from "./deck";
import type { Corpus, CorpusManifest, Idea } from "./types";
import type { DeckState } from "./deck";
import { IdeaActions } from "./IdeaActions";
import { BubbleField } from "@/components/BubbleField";
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
  const [storageOk, setStorageOk] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const state = useRef<DeckState | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const memoryOnly = useRef(false);
  const resultCard = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!idea) return;
    const frame = requestAnimationFrame(() => {
      const card = resultCard.current;
      if (card && card.getBoundingClientRect().bottom > innerHeight - 24) {
        card.scrollIntoView({
          block: "nearest",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [idea]);
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
      }
    };
    window.addEventListener("storage", reconcile);
    return () => window.removeEventListener("storage", reconcile);
  }, [loaded]);
  const generate = useCallback(async () => {
    if (!loaded || inFlight.current || !state.current) return;
    inFlight.current = true;
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
        };
      };
      const result = navigator.locks
        ? await navigator.locks.request("bong-deck-draw", draw)
        : draw();
      // Batch the reveal/disabled styling with the result, rather than making
      // the browser paint it while the cross-tab lock callback is waiting.
      // inFlight already prevents duplicate input throughout the lock wait.
      setBusy(true);
      if (result.next) {
        setIdea(result.next);
      }
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        await new Promise((r) => setTimeout(r, 350));
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }, [loaded]);
  const art = (
    <figure className="art-figure rebrand-art">
      <div className="art-frame">
        <button
          className={`art-button ${busy ? "revealing" : ""}`}
          onClick={generate}
          disabled={!loaded || busy}
          aria-label="Give me an idea from the bong"
        >
          <img
            src="/images/bong-rebrand-900.webp"
            srcSet="/images/bong-rebrand-500.webp 500w, /images/bong-rebrand-900.webp 900w"
            sizes="(max-width: 700px) 64vw, 44vw"
            width="900"
            height="1127"
            alt="The BONG glass bong illustration"
            fetchPriority="high"
          />
          <span className="bong-bubbles" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
    </figure>
  );
  return (
    <section className="hero rebrand-hero" aria-label="The idea generator">
      <BubbleField burstKey={idea?.id} />
      <div className="hero-grid">
        <div className="hero-copy">
          <h1>
            Some ideas change the world. Some just{" "}
            <span className="highlight">sound good at the time.</span>
          </h1>
          <div className="generator-talk">
            {idea && (
              <div
                ref={resultCard}
                className="generator-card"
                data-has-idea="true"
              >
                <div data-idea-id={idea.id}>
                  <p className="idea-text" key={idea.id}>
                    {idea.text}
                  </p>
                </div>
                <IdeaActions
                  key={idea.id}
                  idea={idea}
                  communityEnabled={communityEnabled}
                />
              </div>
            )}
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
                  {!loaded
                    ? "Loading the ideas…"
                    : idea
                      ? "Another idea"
                      : "Give me an idea"}
                  <Icon name="arrow" size={20} />
                </button>
              )}
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {idea?.text ?? ""}
            </p>
            {failure && (
              <p className="status-message" role="alert">
                The ideas couldn’t load. Give it another try. The rest of the
                site is still here.
              </p>
            )}
            {!storageOk && (
              <p className="storage-note">
                Your browser isn’t saving progress. You can keep generating in
                this tab.
              </p>
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
        </div>
        {art}
      </div>
    </section>
  );
}
