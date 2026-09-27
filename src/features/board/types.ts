export type Asset = {
  id: string;
  altText: string;
  width?: number;
  height?: number;
};
export type Post = {
  id: string;
  authorId: string;
  handle: string;
  displayName: string;
  kind: "hear_me_out" | "made_this";
  state: "published" | "pending" | "rejected" | "hidden" | "deleted";
  title: string;
  body: string;
  projectUrl?: string | null;
  sourceIdeaId?: string | null;
  assets?: Asset[];
  publishedAt?: string | null;
  createdAt: string;
  commentCount: number;
  version: number;
  revisionId?: string;
  pendingRevision?: {
    id: string;
    title: string;
    body: string;
    state: string;
    assets?: Asset[];
    projectUrl?: string | null;
    sourceIdeaId?: string | null;
    authorReason?: string | null;
  };
  latestRevision?: PostRevision;
  canEdit?: boolean;
  canDelete?: boolean;
  author?: { id: string; handle: string; displayName: string };
  status?: string;
};
export type PostRevision = {
  id: string;
  title: string;
  body: string;
  state: string;
  authorReason?: string | null;
  assets?: Asset[];
  projectUrl?: string | null;
  sourceIdeaId?: string | null;
};
export type Comment = {
  id: string;
  authorId: string;
  handle: string;
  displayName: string;
  body: string | null;
  state: string;
  createdAt: string;
  version: number;
  replyToCommentId?: string | null;
  replyToHandle?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  latestRevision?: {
    id: string;
    body: string;
    state: string;
    authorReason?: string | null;
  } | null;
  authorReason?: string | null;
};
export function shortDate(date: string | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
