import { ModerationQueue } from "@/features/moderation/ModerationQueue";
export const metadata = {
  title: "Moderation · BONG",
  robots: { index: false, follow: false },
};
export default function ModerationPage() {
  return (
    <section className="page">
      <p className="eyebrow">Care for the conversation</p>
      <h1>Moderation</h1>
      <p className="lead">
        Review real submissions, respond to reports, and record clear decisions.
      </p>
      <ModerationQueue />
    </section>
  );
}
