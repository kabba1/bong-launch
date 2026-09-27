"use client";
import Link from "next/link";
import { useState } from "react";
import type { Idea } from "./types";
import { Icon } from "@/components/Icon";
export function IdeaActions({ idea }: { idea: Idea }) {
  const [notice, setNotice] = useState("");
  const [fallback, setFallback] = useState("");
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(label);
      setFallback("");
    } catch {
      setNotice("Select and copy the text below.");
      setFallback(value);
    }
  }
  async function share() {
    const url = new URL(`/idea/${idea.id}`, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A half-baked idea from BONG",
          text: idea.text,
          url,
        });
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) {
          setNotice("Sharing isn’t available. Copy the link below.");
          setFallback(url);
        }
      }
    } else await copy(url, "Link copied.");
  }
  return (
    <>
      <div className="result-tools">
        <button
          className="tool-button"
          onClick={() => copy(idea.text, "Idea copied.")}
        >
          <Icon name="copy" size={15} />
          Copy idea
        </button>
        <button className="tool-button" onClick={share}>
          <Icon name="share" size={15} />
          Share
        </button>
        <Link
          prefetch={false}
          className="tool-button discuss"
          href={`/board/new?sourceIdeaId=${idea.id}`}
        >
          Discuss this <Icon name="arrow" size={16} />
        </Link>
      </div>
      {notice && (
        <p role="status" className="status-message">
          {notice}
        </p>
      )}
      {fallback && (
        <textarea
          aria-label="Text to copy"
          className="selectable-fallback"
          value={fallback}
          readOnly
          onFocus={(e) => e.target.select()}
        />
      )}
    </>
  );
}
