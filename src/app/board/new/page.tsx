import { headers } from "next/headers";
import { getIdea } from "@/server/content";
import { Composer } from "@/features/board/Composer";
export const metadata = {
  title: "Share a thought",
  robots: { index: false, follow: false },
};
export default async function NewPost({
  searchParams,
}: {
  searchParams: Promise<{ sourceIdeaId?: string }>;
}) {
  const source = (await searchParams).sourceIdeaId;
  const idea = source ? getIdea(source) : undefined;
  return (
    <section className="page narrow">
      <p className="eyebrow">The Board / Your contribution</p>
      <h1>Let’s hear it.</h1>
      <p className="lead">
        It doesn’t have to be fully baked. It does have to be yours to share.
      </p>
      {source && !idea && (
        <p className="notice">
          That source idea isn’t available. You can still share a thought of
          your own.
        </p>
      )}
      <Composer
        sourceIdea={idea}
        nonce={(await headers()).get("x-nonce") ?? undefined}
      />
    </section>
  );
}
