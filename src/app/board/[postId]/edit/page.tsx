import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Composer } from "@/features/board/Composer";
export const metadata = {
  title: "Edit your thought",
  robots: { index: false, follow: false },
};
export default async function Edit({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(postId)) notFound();
  return (
    <section className="page narrow">
      <p className="eyebrow">The Board / Revision</p>
      <h1>A second thought.</h1>
      <p className="lead">
        Your current approved version stays public until this revision is
        approved.
      </p>
      <Composer
        postId={postId}
        nonce={(await headers()).get("x-nonce") ?? undefined}
      />
    </section>
  );
}
