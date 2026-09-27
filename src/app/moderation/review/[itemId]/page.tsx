import { notFound } from "next/navigation";
import { ModerationReview } from "@/features/moderation/ModerationReview";
export const metadata = {
  title: "Review submission · BONG",
  robots: { index: false, follow: false },
};
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(itemId))
    notFound();
  return (
    <section className="page">
      <p className="eyebrow">Exact words. Considered decisions.</p>
      <h1>Review item</h1>
      <ModerationReview itemId={itemId} />
    </section>
  );
}
