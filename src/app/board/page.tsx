import Link from "next/link";
import { BoardFeed } from "@/features/board/BoardFeed";
import { Icon } from "@/components/Icon";
export const metadata = {
  title: "The Board",
  robots: { index: false, follow: true },
};
export default async function Board({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kind =
    typeof params.kind === "string" &&
    ["hear_me_out", "made_this"].includes(params.kind)
      ? params.kind
      : "";
  const query =
    typeof params.query === "string" ? params.query.trim().slice(0, 100) : "";
  const cursor =
    typeof params.cursor === "string" &&
    /^[A-Za-z0-9_-]{1,2048}$/.test(params.cursor)
      ? params.cursor
      : null;
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">A little collective curiosity</span>
          <h1>The Board.</h1>
          <p>Half-baked thoughts. Things you’ve made. People who get it.</p>
        </div>
        <Link className="button primary" href="/board/new">
          <Icon name="plus" />
          Share a thought
        </Link>
      </div>
      <BoardFeed
        initialKind={kind}
        initialQuery={query}
        initialCursor={cursor}
      />
      <p className="tiny">
        A real community starts with real people. Read our{" "}
        <Link href="/community-rules">community rules</Link> before joining in.
      </p>
    </section>
  );
}
