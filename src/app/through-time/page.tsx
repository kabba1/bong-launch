import { Suspense } from "react";
import { listPublishedTimeline } from "@/server/content";
import { TimelineArchive } from "@/features/timeline/TimelineArchive";
import { TimelineSearch } from "@/features/timeline/TimelineSearch";
import "@/styles/timeline.css";
export const metadata = {
  title: "Bong Through Time",
  description:
    "Some ideas made history. Explore the moments that changed how people lived, the problems they were trying to solve, and what happened next.",
  alternates: { canonical: "/through-time" },
};
export default async function Timeline() {
  const entries = listPublishedTimeline();
  // Owner-requested local test content is never part of the published archive.
  if (process.env.NODE_ENV === "development" && !entries.length) {
    const { TimelinePreview } =
      await import("@/features/timeline/TimelinePreview");
    const { previewEvents } =
      await import("@/features/timeline/preview-events");
    return (
      <section className="page time-preview">
        <h1 className="sr-only">Bong Through Time</h1>
        <TimelinePreview events={previewEvents} />
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
