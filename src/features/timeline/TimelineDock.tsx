"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
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
const hues = [40, 48, 150, 205, 225, 262, 190];
const tint = (index: number) => `hsl(${hues[index % hues.length]} 75% 84%)`;

function DisplayDate({ event }: { event: TimelineEvent }) {
  // These are display labels, never parsed dates or chronology sort keys.
  const prehistoric = /^(\d+(?:\.\d+)?)m years ago$/.exec(event.shortDate);
  const datedEra = /^(.*?)\s+(BCE|CE)$/.exec(event.shortDate);
  const year = prehistoric?.[1] ?? datedEra?.[1] ?? event.shortDate;
  const unit = prehistoric ? "million years ago" : datedEra?.[2];

  return (
    <div
      className={`chronology-year${year.length > 10 ? " chronology-year-long" : ""}`}
      aria-hidden="true"
    >
      <span>{year}</span>
      {unit && <span className="chronology-year-unit">{unit}</span>}
    </div>
  );
}

function EventStory({ event }: { event: TimelineEvent }) {
  return (
    <div className="chronology-story">
      <span className="chronology-era">{event.era}</span>
      <h2 id={"timeline-heading-" + event.id}>{event.title}</h2>
      <p className="chronology-date">{event.date}</p>
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
          <span>{event.source}</span> <Icon name="arrow" size={16} />
          {!event.href && (
            <span className="sr-only"> (opens in a new tab)</span>
          )}
        </a>
      </div>
    </div>
  );
}

/** Scrolling presentation shared by short events and long-form history articles. */
export function TimelineDock({ events }: { events: TimelineEvent[] }) {
  const enhanced = useSyncExternalStore(
    subscribeToHydration,
    hydrated,
    serverRendered,
  );
  const [selected, setSelected] = useState(0);
  const timeline = useRef<HTMLDivElement>(null);
  const chapters = useRef<(HTMLLIElement | null)[]>([]);
  const dots = useRef<HTMLOListElement>(null);
  const current = events[selected] ?? events[0];

  useEffect(() => {
    const element = timeline.current;
    if (!element) return;
    let frame: number | null = null;

    function update() {
      frame = null;
      if (!element) return;
      const style = getComputedStyle(element);
      const header =
        parseFloat(style.getPropertyValue("--header-height")) || 76;
      const navigation =
        parseFloat(style.getPropertyValue("--timeline-navigation-height")) || 0;
      const readingLine =
        header +
        navigation +
        Math.max(0, innerHeight - header - navigation) / 2;
      let next = 0;
      chapters.current.slice(0, events.length).forEach((chapter, index) => {
        if (chapter && chapter.getBoundingClientRect().top <= readingLine) {
          next = index;
        }
      });
      setSelected(next);
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(update);
    }

    // Observe ordinary document scrolling; wheel, touch and page keys keep their
    // native behavior. A resized/zoomed chapter can always grow with its text.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    schedule();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [events.length]);

  useEffect(() => {
    const list = dots.current;
    const button =
      list?.querySelectorAll<HTMLButtonElement>("button")[selected];
    if (!list || !button) return;
    const point = button.getBoundingClientRect();
    const bounds = list.getBoundingClientRect();
    // Only the dot rail moves here, never the reader's document scroll position.
    list.scrollTo({
      left:
        list.scrollLeft +
        point.left -
        bounds.left -
        (bounds.width - point.width) / 2,
      top:
        list.scrollTop +
        point.top -
        bounds.top -
        (bounds.height - point.height) / 2,
      behavior: "instant",
    });
  }, [selected]);

  if (!current) return null;

  function select(index: number, focusDot = false) {
    const next = Math.max(0, Math.min(events.length - 1, index));
    chapters.current[next]?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    if (focusDot) {
      dots.current
        ?.querySelectorAll<HTMLButtonElement>("button")
        [next]?.focus({ preventScroll: true });
    }
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: events.length - 1,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      select(next, true);
    }
  }

  return (
    <div
      className={`chronology chronology-scroll ${enhanced ? "chronology-enhanced" : "chronology-static"}`}
      ref={timeline}
      style={{ "--timeline-tint": tint(selected) } as CSSProperties}
    >
      <nav className="chronology-navigation" aria-label="Historical timeline">
        <button
          className="chronology-previous"
          type="button"
          aria-label="Previous event"
          disabled={selected === 0}
          onClick={() => select(selected - 1)}
        >
          <Icon name="arrow" size={20} />
        </button>
        <ol className="chronology-dots" ref={dots}>
          {events.map((event, index) => (
            <li key={event.id}>
              <button
                type="button"
                aria-label={`${event.date}: ${event.title}`}
                aria-current={index === selected ? "step" : undefined}
                aria-controls={"timeline-event-" + event.id}
                title={`${event.date}: ${event.title}`}
                tabIndex={index === selected ? 0 : -1}
                onClick={() => select(index, true)}
                onKeyDown={(key) => navigate(key, index)}
              >
                <span aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        <button
          className="chronology-next"
          type="button"
          aria-label="Next event"
          disabled={selected === events.length - 1}
          onClick={() => select(selected + 1)}
        >
          <Icon name="arrow" size={20} />
        </button>
      </nav>
      <ol className="chronology-chapters">
        {events.map((event, index) => (
          <li
            className="chronology-chapter"
            key={event.id}
            id={"timeline-event-" + event.id}
            data-active={index === selected}
            style={{ "--scene-tint": tint(index) } as CSSProperties}
            ref={(element) => {
              chapters.current[index] = element;
            }}
          >
            <article
              className="chronology-scene"
              aria-labelledby={"timeline-heading-" + event.id}
            >
              <DisplayDate event={event} />
              <div className="chronology-glyph" aria-hidden="true">
                <TimelineGlyph id={event.id} />
              </div>
              <EventStory event={event} />
              <p className="chronology-caption" aria-hidden="true">
                <span>Bong Through Time</span>
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(events.length).padStart(2, "0")}
                </span>
              </p>
            </article>
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status" aria-atomic="true">
        {enhanced ? `${current.date}: ${current.title}` : ""}
      </p>
    </div>
  );
}
