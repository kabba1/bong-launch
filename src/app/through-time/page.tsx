import { Suspense } from "react";
import { listPublishedTimeline } from "@/server/content";
import { TimelineArchive } from "@/features/timeline/TimelineArchive";
import { TimelineSearch } from "@/features/timeline/TimelineSearch";
import { TimelineDock } from "@/features/timeline/TimelineDock";
import { timelineEvents } from "@/features/timeline/events";
import "@/styles/timeline.css";
export const metadata = {
  title: "Bong Through Time",
  description:
    "Some ideas made history. Explore the moments that changed how people lived, the problems they were trying to solve, and what happened next.",
  alternates: { canonical: "/through-time" },
};
export default async function Timeline() {
  const entries = listPublishedTimeline();
  if (!entries.length) {
    return (
      <section className="page time-preview">
        <h1 className="sr-only">Bong Through Time</h1>
        <TimelineDock events={timelineEvents} />
      </section>
    );
  }
  return (
    <section className="page time-archive time-preview">
      <h1 className="sr-only">Bong Through Time</h1>
      {entries.length >= 12 ? (
        <>
          <noscript>
            Search needs JavaScript. All published stories are shown below.
          </noscript>
          <Suspense fallback={<TimelineArchive entries={entries} />}>
            <TimelineSearch entries={entries} />
          </Suspense>
        </>
      ) : (
        <TimelineArchive entries={entries} />
      )}
    </section>
  );
}
