import { AdminControls } from "@/features/moderation/AdminControls";
export const metadata = {
  title: "Audit history · BONG",
  robots: { index: false, follow: false },
};
export default function AuditPage() {
  return (
    <section className="page">
      <p className="eyebrow">Accountable actions</p>
      <h1>Audit history</h1>
      <AdminControls view="audit" />
    </section>
  );
}
