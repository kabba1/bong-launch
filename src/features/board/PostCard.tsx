import Link from "next/link";
import { type Post, shortDate } from "./types";
export function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card">
      <div>
        <span className={`badge ${post.kind === "made_this" ? "blue" : ""}`}>
          {post.kind === "made_this" ? "Made this" : "Hear me out"}
        </span>
        {post.state !== "published" && (
          <span className="badge">{post.state}</span>
        )}
        <h2>
          <Link href={`/board/${post.id}`}>{post.title}</Link>
        </h2>
        <p>
          {post.body.slice(0, 210)}
          {post.body.length > 210 ? "…" : ""}
        </p>
        <div className="post-meta">
          <Link href={`/members/${post.handle}`}>@{post.handle}</Link>
          <span>{shortDate(post.publishedAt ?? post.createdAt)}</span>
          <span>{post.commentCount ?? 0} replies</span>
        </div>
      </div>
      {post.assets?.[0] && (
        <img
          src={`/api/media/${post.assets[0].id}/thumb`}
          alt={post.assets[0].altText}
          loading="lazy"
          width={145}
          height={115}
        />
      )}
    </article>
  );
}
