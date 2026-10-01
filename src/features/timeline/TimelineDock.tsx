"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Icon } from "@/components/Icon";
import { TimelineGlyph } from "./TimelineGlyph";

export interface TimelineEvent {
  id: string;
  date: string;
  shortDate: string;
  era: string;
  title: string;
  text: string;
  source: string;
  url: string;
  narration?: string;
  href?: string;
}

const subscribeToHydration = () => () => {};
const hydrated = () => true;
const serverRendered = () => false;

function EventStory({ event }: { event: TimelineEvent }) {
  return (
    <article className="chronology-story">
      <h2>{event.title}</h2>
      {event.narration && (
        <div className="chronology-narration">
          <h3>BONG’s narration · Fiction</h3>
          <p>{event.narration}</p>
        </div>
      )}
      {event.narration && <h3>The history</h3>}
      <p>{event.text}</p>
      <div className="chronology-links">
        {event.href && (
          <Link className="text-link" href={event.href}>
            Read the story <Icon name="arrow" size={16} />
          </Link>
        )}
        <a
          className="chronology-source"
          href={event.url}
          {...(!event.href
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {event.source} <Icon name="arrow" size={14} />
          {!event.href && (
            <span className="sr-only"> (opens in a new tab)</span>
          )}
        </a>
      </div>
    </article>
  );
}

/** Shared presentation for sourced short events and long-form history articles. */
export function TimelineDock({ events }: { events: TimelineEvent[] }) {
  const enhanced = useSyncExternalStore(
    subscribeToHydration,
    hydrated,
    serverRendered,
  );
  const [selected, setSelected] = useState(0);
  const rail = useRef<HTMLOListElement>(null);
  const drag = useRef<{
    x: number;
    left: number;
    moved: boolean;
    pointer: number;
  } | null>(null);
  const blockClick = useRef(false);
  const hoverFrame = useRef<number | null>(null);
  const pointerX = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current);
    },
    [],
  );
  const current = events[selected] ?? events[0];
  if (!current) return null;

  function resetMagnification() {
    if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = null;
    pointerX.current = null;
    rail.current?.querySelectorAll<HTMLElement>("li").forEach((slot) => {
      slot.style.removeProperty("--dock-proximity");
    });
  }

  function magnify(event: PointerEvent<HTMLOListElement>) {
    if (
      event.pointerType !== "mouse" ||
      event.buttons !== 0 ||
      !window.matchMedia(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      ).matches
    )
      return;
    pointerX.current = event.clientX;
    if (hoverFrame.current !== null) return;
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = null;
      const track = rail.current;
      if (!track || pointerX.current === null) return;
      const x =
        pointerX.current -
        track.getBoundingClientRect().left +
        track.scrollLeft;
      // Fixed slots are the measuring surface; the growing tiles never move it.
      track.querySelectorAll<HTMLElement>("li").forEach((slot) => {
        const distance = Math.abs(x - slot.offsetLeft - slot.offsetWidth / 2);
        const weight =
          distance < 210 ? (1 + Math.cos((Math.PI * distance) / 210)) / 2 : 0;
        slot.style.setProperty("--dock-proximity", weight.toFixed(3));
      });
    });
  }

  function select(index: number, focus = false) {
    resetMagnification();
    const next = Math.max(0, Math.min(events.length - 1, index));
    setSelected(next);
    const point =
      rail.current?.querySelectorAll<HTMLButtonElement>("button")[next];
    if (point && rail.current) {
      const bounds = point.getBoundingClientRect();
      const track = rail.current.getBoundingClientRect();
      rail.current.scrollTo({
        left:
          rail.current.scrollLeft +
          bounds.left -
          track.left -
          (track.width - bounds.width) / 2,
        behavior: "instant",
      });
    }
    if (focus) point?.focus({ preventScroll: true });
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    blockClick.current = false;
    const next = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: events.length - 1,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      select(next, true);
    }
  }

  function startDrag(event: PointerEvent<HTMLOListElement>) {
    blockClick.current = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    resetMagnification();
    event.preventDefault();
    drag.current = {
      x: event.clientX,
      left: event.currentTarget.scrollLeft,
      moved: false,
      pointer: event.pointerId,
    };
  }
  function moveDrag(event: PointerEvent<HTMLOListElement>) {
    const start = drag.current;
    if (!start) {
      magnify(event);
      return;
    }
    const distance = event.clientX - start.x;
    if (Math.abs(distance) > 6) {
      start.moved = true;
      blockClick.current = true;
      event.currentTarget.setPointerCapture(start.pointer);
      event.currentTarget.scrollLeft = start.left - distance;
      event.currentTarget.dataset.dragging = "true";
    }
  }
  function endDrag(event: PointerEvent<HTMLOListElement>) {
    if (
      drag.current &&
      event.currentTarget.hasPointerCapture(drag.current.pointer)
    ) {
      event.currentTarget.releasePointerCapture(drag.current.pointer);
    }
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
  }

  return (
    <div
      className={`chronology ${enhanced ? "chronology-enhanced" : "chronology-static"}`}
    >
      <div className="chronology-topline">
        <span>{current.era}</span>
        <div className="chronology-controls">
          <span className="chronology-count" aria-hidden="true">
            {String(selected + 1).padStart(2, "0")} /{" "}
            {String(events.length).padStart(2, "0")}
          </span>
          <div className="chronology-arrows">
            <button
              type="button"
              aria-label="Previous event"
              disabled={selected === 0}
              onClick={() => select(selected - 1)}
            >
              <Icon name="arrow" size={20} />
            </button>
            <button
              type="button"
              aria-label="Next event"
              disabled={selected === events.length - 1}
              onClick={() => select(selected + 1)}
            >
              <Icon name="arrow" size={20} />
            </button>
          </div>
        </div>
      </div>
      <nav className="chronology-navigation" aria-label="Historical timeline">
        <div className="chronology-dock">
          <ol
            className="chronology-rail"
            ref={rail}
            role="tablist"
            aria-label="Choose a moment in history"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={(event) => {
              resetMagnification();
              endDrag(event);
            }}
            onScroll={resetMagnification}
            onPointerLeave={(event) => {
              resetMagnification();
              if (!drag.current?.moved) endDrag(event);
            }}
            onClickCapture={(event) => {
              if (blockClick.current) {
                event.preventDefault();
                event.stopPropagation();
                blockClick.current = false;
              }
            }}
          >
            {events.map((event, index) => (
              <li key={event.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={"timeline-tab-" + event.id}
                  aria-selected={index === selected}
                  aria-controls="timeline-detail"
                  tabIndex={index === selected ? 0 : -1}
                  onClick={() => select(index, true)}
                  onKeyDown={(key) => navigate(key, index)}
                >
                  <span className="chronology-tile" aria-hidden="true">
                    <TimelineGlyph id={event.id} />
                  </span>
                  <span className="chronology-point-date">
                    {event.shortDate}
                  </span>
                  <span className="chronology-point-title">{event.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <span className="chronology-scale">
          Scroll through time <span aria-hidden="true">·</span> Dates not to
          scale
        </span>
      </nav>
      <div
        className="chronology-detail"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={"timeline-tab-" + current.id}
        id="timeline-detail"
      >
        <div className="chronology-date">{current.date}</div>
        <EventStory event={current} />
      </div>
      <p className="sr-only" role="status">
        {current.date + ": " + current.title}
      </p>
      {!enhanced && (
        <ol className="chronology-fallback">
          {events.slice(1).map((event) => (
            <li key={event.id}>
              <p className="time-date">{event.date}</p>
              <EventStory event={event} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
