import { Suspense } from "react";
import { listPublishedTimeline } from "@/server/content";
import { TimelineArchive } from "@/features/timeline/TimelineArchive";
import { TimelineSearch } from "@/features/timeline/TimelineSearch";
import "@/styles/timeline.css";
export const metadata = {
  title: "Bong Through Time",
  description:
    "Explore a timeline of human history, with sourced facts and short narration in BONG’s voice.",
  alternates: { canonical: "/through-time" },
};
export default function Timeline() {
  const entries = listPublishedTimeline();
  return (
    <section className="page time-archive">
      <p className="eyebrow">Human history</p>
      <h1>Bong Through Time.</h1>
      <p className="lead">A closer look at human history.</p>
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
