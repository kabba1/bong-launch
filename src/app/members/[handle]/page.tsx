import { notFound } from "next/navigation";
import Link from "next/link";
import { pageData, missing } from "@/lib/page-data";
import { PostCard } from "@/features/board/PostCard";
import { ReportForm } from "@/features/board/ReportForm";
import type { Post } from "@/features/board/types";
export const metadata = {
  title: "Community member",
  robots: { index: false, follow: true },
};
type Member = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  joined: string;
  posts: Post[];
};
export default async function Profile({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!/^[a-z0-9][a-z0-9_]{2,23}$/.test(handle)) notFound();
  let member: Member;
  try {
    member = await pageData<Member>("member.get", { handle });
  } catch (e) {
    if (missing(e)) notFound();
    return (
      <section className="page narrow">
        <h1>This profile is taking a moment.</h1>
        <p className="notice">The board is temporarily unavailable.</p>
        <Link className="button quiet" href={`/members/${handle}`}>
          Try again
        </Link>
      </section>
    );
  }
  return (
    <section className="page">
      <p className="eyebrow">A member of the community</p>
      <h1>{member.displayName || member.handle}</h1>
      <p>
        @{member.handle} · Joined {member.joined}
      </p>
      {member.bio && <p className="lead">{member.bio}</p>}
      <ReportForm targetType="member" targetId={member.id} />
      <h2>Published thoughts.</h2>
      {member.posts.length ? (
        <div className="post-list">
          {member.posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No published posts yet.</p>
        </div>
      )}
    </section>
  );
}
