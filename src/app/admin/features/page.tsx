import { AdminControls } from "@/features/moderation/AdminControls";
export const metadata = {
  title: "Incident controls · BONG",
  robots: { index: false, follow: false },
};
export default function FeaturesPage() {
  return (
    <section className="page narrow">
      <p className="eyebrow">Keep the community safe</p>
      <h1>Incident controls</h1>
      <AdminControls view="features" />
    </section>
  );
}
