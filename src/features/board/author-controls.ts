import type { Session } from "@/lib/api-client";
import type { Comment, Post } from "./types";

/** Presentation only. Every write is authorized again by the server. */
export function canParticipate(session: Session | null) {
  return (
    !!session?.user &&
    session.onboarded &&
    session.postingEnabled &&
    session.member?.state === "active"
  );
}
export function canEditPost(post: Post, session: Session | null) {
  return (
    canParticipate(session) &&
    session?.user?.id === post.authorId &&
    !["hidden", "deleted"].includes(post.state)
  );
}
export function canEditComment(
  comment: Comment,
  post: Post,
  session: Session | null,
  now: number,
) {
  const age = now - Date.parse(comment.createdAt);
  return (
    canParticipate(session) &&
    session?.user?.id === comment.authorId &&
    post.state === "published" &&
    !["hidden", "deleted"].includes(comment.state) &&
    age >= 0 &&
    age < 900_000
  );
}
