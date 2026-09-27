import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Post, Comment } from "../../src/features/board/types";
import type { Session } from "../../src/lib/api-client";
import {
  canEditPost,
  canEditComment,
} from "../../src/features/board/author-controls";
import { CommentItem } from "../../src/features/board/PostDiscussion";
import PostPage from "../../src/app/board/[postId]/page";

const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/page-data", () => ({ pageData: read, missing: () => false }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({}),
  notFound: () => {
    throw new Error("404");
  },
}));
const author = "00000000-0000-4000-8000-000000000001";
const post: Post = {
  id: "00000000-0000-4000-8000-000000000002",
  authorId: author,
  handle: "test_author",
  displayName: "Test author",
  kind: "made_this",
  state: "published",
  title: "Approved title",
  body: "Approved public body",
  version: 3,
  commentCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
  projectUrl: "https://approved.invalid/",
  sourceIdeaId: "BONG-0001",
};
const session: Session = {
  user: { id: author },
  member: { handle: "test_author", state: "active" },
  onboarded: true,
  role: null,
  postingEnabled: true,
  uploadsEnabled: true,
  registrationEnabled: true,
};

describe("author UI states (BOARD-04/05, COMMENT-05, UX-06)", () => {
  it("offers generic session recovery once and retains a genuine missing result on retry", async () => {
    read.mockRejectedValue({ code: "SESSION_RECOVERY_REQUIRED" });
    const page = await PostPage({
      params: Promise.resolve({ postId: post.id }),
    });
    expect(renderToStaticMarkup(page)).toContain("Checking your session.");
    await expect(
      PostPage({
        params: Promise.resolve({ postId: post.id }),
        searchParams: Promise.resolve({ authRecovery: "1" }),
      }),
    ).rejects.toThrow("404");
  });
  it("only offers edits for an active author on editable records", () => {
    expect(canEditPost(post, session)).toBe(true);
    expect(
      canEditPost(post, { ...session, user: { id: "someone-else" } }),
    ).toBe(false);
    for (const state of ["hidden", "deleted"] as const)
      expect(canEditPost({ ...post, state }, session)).toBe(false);
    expect(canEditPost(post, { ...session, postingEnabled: false })).toBe(
      false,
    );
    expect(
      canEditPost(post, {
        ...session,
        member: { handle: "test_author", state: "suspended" },
      }),
    ).toBe(false);
    const comment: Comment = {
      id: "comment",
      authorId: author,
      handle: "test_author",
      displayName: "Test",
      body: "Before",
      state: "published",
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const start = Date.parse(comment.createdAt);
    expect(canEditComment(comment, post, session, start + 899999)).toBe(true);
    expect(canEditComment(comment, post, session, start + 900000)).toBe(false);
    expect(
      canEditComment(comment, { ...post, state: "hidden" }, session, start + 1),
    ).toBe(false);
  });

  it("shows the complete private candidate without filling removed fields from the approved revision", async () => {
    read.mockResolvedValue({
      ...post,
      latestRevision: {
        id: "candidate",
        title: "Candidate title",
        body: "Candidate private body",
        state: "pending",
        projectUrl: null,
        sourceIdeaId: "BONG-0002",
        assets: [
          { id: "candidate-image", altText: "A test-only candidate image" },
        ],
      },
    });
    const html = renderToStaticMarkup(
      await PostPage({ params: Promise.resolve({ postId: post.id }) }),
    );
    const preview = html.slice(
      html.indexOf("<details"),
      html.indexOf("</details>"),
    );
    expect(preview).toContain("Candidate private body");
    expect(preview).toContain("/api/media/candidate-image/main");
    expect(preview).toContain("BONG-0002");
    expect(preview).not.toContain("approved.invalid");
    expect(preview).not.toContain("BONG-0001");
    expect(html).toContain("Approved public body");
  });

  it("shows pending comment text and a rejected edit's author reason while retaining approved text", () => {
    for (const state of ["pending", "rejected"]) {
      const comment = {
        id: "comment",
        authorId: author,
        handle: "test_author",
        displayName: "Test",
        body: "Approved comment",
        state: "published",
        version: 2,
        createdAt: "2026-01-01T00:00:00Z",
        latestRevision: {
          id: "candidate",
          body: "Private candidate comment",
          state,
          authorReason: state === "rejected" ? "Test-only author reason" : null,
        },
      };
      const html = renderToStaticMarkup(
        createElement(CommentItem, {
          comment,
          post,
          session,
          onChange: () => {},
          onReply: () => {},
        }),
      );
      expect(html).toContain("Approved comment");
      expect(html).toContain("Private candidate comment");
      expect(html).toContain(
        state === "pending" ? "waiting for review" : "Test-only author reason",
      );
    }
  });
});
