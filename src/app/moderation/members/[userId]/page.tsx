import { notFound } from "next/navigation";
import { MemberReview } from "@/features/moderation/MemberReview";
export const metadata = {
  title: "Member review · BONG",
  robots: { index: false, follow: false },
};
export default async function MemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId))
    notFound();
  return (
    <section className="page narrow">
      <p className="eyebrow">Community participation</p>
      <h1>Member review</h1>
      <MemberReview userId={userId} />
    </section>
  );
}
