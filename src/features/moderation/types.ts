export interface ReviewAuthor {
  id: string | null;
  handle: string | null;
  displayName: string | null;
}
export interface ReviewAsset {
  id: string;
  altText: string;
  width: number;
  height: number;
}
export interface ReviewPost {
  id: string;
  kind: string;
  state: string;
  version: number;
  revisionId: string | null;
  title: string;
  body: string;
  projectUrl?: string | null;
  sourceIdeaId?: string | null;
  createdAt: string;
  publishedAt?: string | null;
  author: ReviewAuthor;
  assets: ReviewAsset[];
  latestRevision?: {
    id: string;
    title: string;
    body: string;
    projectUrl?: string | null;
    sourceIdeaId?: string | null;
    state: string;
    authorReason?: string | null;
    assets: ReviewAsset[];
  };
}
export interface ReviewComment {
  id: string;
  postId: string;
  state: string;
  version: number;
  createdAt: string;
  body: string;
  revisionId: string;
  author: ReviewAuthor;
  authorReason?: string | null;
  replyToHandle?: string | null;
  latestRevision?: {
    id: string;
    body: string;
    state: string;
    authorReason?: string | null;
  };
}
export interface ReviewReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  detail: string;
  status: string;
  version: number;
  createdAt: string;
}
export interface ReviewQueue {
  items: {
    id: string;
    targetType: "post" | "comment" | "report";
    createdAt: string;
    priority: number;
    item: ReviewPost | ReviewComment | ReviewReport;
  }[];
  posts: ReviewPost[];
  comments: ReviewComment[];
  reports: ReviewReport[];
  counts: { posts: number; comments: number; reports: number };
  page?: { nextCursor: string | null; hasMore: boolean };
  nextCursor?: string | null;
}
export type ReviewItem =
  | { targetType: "post"; item: ReviewPost }
  | { targetType: "comment"; item: ReviewComment }
  | { targetType: "report"; item: ReviewReport };
