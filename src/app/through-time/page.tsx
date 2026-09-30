import { Suspense } from "react";
import { listPublishedTimeline } from "@/server/content";
import { TimelineArchive } from "@/features/timeline/TimelineArchive";
import { TimelineSearch } from "@/features/timeline/TimelineSearch";
import "@/styles/timeline.css";
export const metadata = {
  title: "Bong Through Time",
  description:
    "The history of inventions and discoveries, alongside BONG’s fictional version of events.",
  alternates: { canonical: "/through-time" },
};
export default function Timeline() {
  const entries = listPublishedTimeline();
  return (
    <section className="page time-archive">
      <p className="eyebrow">The unofficial record</p>
      <h1>Bong Through Time.</h1>
      <p className="lead">Real history. BONG takes the credit.</p>
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
