"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { Turnstile } from "@/components/Turnstile";
import type { Idea } from "@/features/generator/types";
import type { Asset, Post } from "./types";
import { canEditPost, canParticipate } from "./author-controls";
type Draft = {
  kind: "hear_me_out" | "made_this";
  title: string;
  body: string;
  projectUrl: string;
  sourceIdeaId: string | null;
  idempotencyKey: string;
  updatedAt: number;
};
const empty = (source: string | null): Draft => ({
  kind: "hear_me_out",
  title: "",
  body: "",
  projectUrl: "",
  sourceIdeaId: source,
  idempotencyKey: crypto.randomUUID(),
  updatedAt: Date.now(),
});
function restore(
  value: string | null,
  source: string | null,
  editing: boolean,
): Draft | null {
  try {
    if (!value || value.length > 30000) return null;
    const v = JSON.parse(value);
    if (
      v.updatedAt > Date.now() + 60000 ||
      Date.now() - v.updatedAt > 86400000 ||
      !["hear_me_out", "made_this"].includes(v.kind) ||
      typeof v.title !== "string" ||
      v.title.length > 400 ||
      typeof v.body !== "string" ||
      v.body.length > 20000 ||
      typeof v.projectUrl !== "string" ||
      v.projectUrl.length > 2048 ||
      typeof v.idempotencyKey !== "string" ||
      !/^[-0-9a-f]{36}$/.test(v.idempotencyKey)
    )
      return null;
    return {
      ...empty(source),
      kind: v.kind,
      title: v.title,
      body: v.body,
      projectUrl: v.projectUrl,
      sourceIdeaId:
        editing &&
        typeof v.sourceIdeaId === "string" &&
        /^BONG-\d{4}$/.test(v.sourceIdeaId)
          ? v.sourceIdeaId
          : source,
      idempotencyKey: v.idempotencyKey,
      updatedAt: v.updatedAt,
    };
  } catch {
    return null;
  }
}
export function Composer({
  sourceIdea,
  postId,
  nonce,
}: {
  sourceIdea?: Idea;
  postId?: string;
  nonce?: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [existing, setExisting] = useState<Post | null>(null);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [result, setResult] = useState<{
    id: string;
    status?: string;
    state?: string;
  } | null>(null);
  const [stored, setStored] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const key = `bong:draft:v1:${postId ?? sourceIdea?.id ?? "new"}`;
  const returnTo = postId
    ? `/board/${postId}/edit`
    : `/board/new${sourceIdea ? `?sourceIdeaId=${sourceIdea.id}` : ""}`;
  useEffect(() => {
    let mounted = true;
    let restored: Draft | null = null;
    try {
      restored = restore(
        sessionStorage.getItem(key),
        sourceIdea?.id ?? null,
        !!postId,
      );
    } catch {
      queueMicrotask(() => setStored(false));
    }
    queueMicrotask(() => {
      if (mounted) {
        setError(null);
        setDraft(restored ?? empty(sourceIdea?.id ?? null));
      }
    });
    api<Session>("/session")
      .then((r) => {
        if (mounted) setSession(r.data);
      })
      .catch((e) => {
        if (mounted) setError(e);
      });
    if (postId)
      api<Post>(`/board/posts/${postId}`)
        .then((r) => {
          if (!mounted) return;
          setExisting(r.data);
          const current =
            r.data.latestRevision ?? r.data.pendingRevision ?? r.data;
          setAssets(current.assets ?? []);
          if (!restored)
            setDraft({
              ...empty(current.sourceIdeaId ?? null),
              kind: r.data.kind,
              title: current.title,
              body: current.body,
              projectUrl: current.projectUrl ?? "",
              sourceIdeaId: current.sourceIdeaId ?? null,
            });
        })
        .catch((e) => {
          if (mounted) setError(e);
        });
    return () => {
      mounted = false;
    };
  }, [key, postId, sourceIdea?.id, attempt]);
  function update(fields: Partial<Draft>) {
    if (!draft) return;
    const next = { ...draft, ...fields, updatedAt: Date.now() };
    setDraft(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      setStored(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError(
        new Error("Use a JPEG, PNG, or static WebP smaller than 3 MiB."),
      );
      return;
    }
    setUploading(true);
    setError(null);
    const data = new FormData();
    data.set("file", file);
    data.set("captchaToken", token);
    try {
      const response = await api<Asset>("/uploads", {
        method: "POST",
        body: data,
      });
      setAssets((old) => [...old, { ...response.data, altText: "" }]);
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
      setChallenge((c) => c + 1);
      setToken("");
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy || !allowed) return;
    setBusy(true);
    setError(null);
    try {
      const common = {
        title: draft.title,
        body: draft.body,
        projectUrl: draft.projectUrl || null,
        sourceIdeaId: draft.sourceIdeaId,
        assets: assets.map((a) => ({ id: a.id, altText: a.altText })),
      };
      const response = await api<{
        id: string;
        status?: string;
        state?: string;
      }>(postId ? `/board/posts/${postId}` : "/board/posts", {
        method: postId ? "PATCH" : "POST",
        body: postId
          ? { ...common, expectedVersion: existing?.version }
          : {
              ...common,
              kind: draft.kind,
              idempotencyKey: draft.idempotencyKey,
            },
      });
      setResult(response.data);
      try {
        sessionStorage.removeItem(key);
      } catch {}
    } catch (e) {
      setError(e);
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    } finally {
      setBusy(false);
    }
  }
  const signedIn = !!session?.user;
  const allowed =
    canParticipate(session) &&
    (!postId || (!!existing && canEditPost(existing, session)));
  if (postId && (!session || (session.user && !existing)))
    return (
      <div className="flow">
        <Feedback error={error} />
        {error ? (
          <button
            className="button quiet"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try loading this post again
          </button>
        ) : (
          <p className="loading-line" role="status">
            Checking this post and your edit access…
          </p>
        )}
      </div>
    );
  if (postId && !session?.user)
    return (
      <p className="notice">
        <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>
          Sign in
        </Link>{" "}
        to edit your own post. An unsent draft in this tab will be kept.
      </p>
    );
  if (postId && existing && !canEditPost(existing, session))
    return (
      <div className="empty-state">
        <h2>This post cannot be edited from this account</h2>
        <p>
          {existing.authorId !== session?.user?.id
            ? "Only the author can submit a revision."
            : ["hidden", "deleted"].includes(existing.state)
              ? `This post is ${existing.state}. Editing cannot republish it.`
              : "Editing is currently unavailable for this account or while posting is closed. Your draft remains in this tab."}
        </p>
        <Link className="button quiet" href="/account">
          Your account
        </Link>
        <Link className="text-link" href="/board">
          Back to the board
        </Link>
      </div>
    );
  if (result)
    return (
      <div className="empty-state">
        <p className="eyebrow">
          {result.status === "published" || result.state === "published"
            ? "Published"
            : "Submitted for review"}
        </p>
        <h2>
          {result.status === "published" || result.state === "published"
            ? "Your thought is out there."
            : "Your thought is in good hands."}
        </h2>
        <p>
          {result.status === "published" || result.state === "published"
            ? "It’s saved and ready for the community."
            : "Your submission is saved. A moderator will review it before it appears publicly. An existing approved version stays visible while an edit is reviewed."}
        </p>
        <Link className="button primary" href={`/board/${result.id ?? postId}`}>
          View your submission
        </Link>
        <Link className="text-link" href="/account">
          Your account
        </Link>
      </div>
    );
  return (
    <>
      {existing?.latestRevision &&
        ["pending", "rejected"].includes(existing.latestRevision.state) && (
          <p className="notice">
            {existing.latestRevision.state === "pending"
              ? "Your latest revision is waiting for review. Submitting again replaces that pending revision."
              : "Your latest revision was rejected. You can revise it and submit it for another review."}
            {existing.latestRevision.authorReason && (
              <> Review note: {existing.latestRevision.authorReason}</>
            )}
          </p>
        )}
      {session && !signedIn && (
        <div className="notice">
          <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>
            Sign in
          </Link>{" "}
          to submit your thought. You can start writing here; this tab keeps
          your draft.
        </div>
      )}
      {session && signedIn && !session.onboarded && (
        <p className="notice">
          <Link href="/onboarding">Finish your community profile</Link> before
          submitting.
        </p>
      )}
      {session && !session.postingEnabled && (
        <p className="notice">
          The board is currently read-only. Your draft stays in this tab.
        </p>
      )}
      {sourceIdea && (
        <aside className="source-quote">
          <span className="eyebrow">Starting point / {sourceIdea.id}</span>
          <p>{sourceIdea.text}</p>
          <Link className="tiny" href={`/idea/${sourceIdea.id}`}>
            View the original idea
          </Link>
        </aside>
      )}
      {draft && (
        <form ref={form} onSubmit={submit} className="form-card">
          <div className="form-field">
            <label htmlFor="kind">What are you sharing?</label>
            <select
              id="kind"
              value={draft.kind}
              disabled={!!postId}
              onChange={(e) =>
                update({ kind: e.target.value as Draft["kind"] })
              }
            >
              <option value="hear_me_out">
                Hear me out — a thought or an idea
              </option>
              <option value="made_this">
                Made this — something I’ve worked on
              </option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="title">Give it a title</label>
            <input
              id="title"
              required
              minLength={5}
              maxLength={100}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
            />
            <small>5–100 characters. Start with the interesting bit.</small>
          </div>
          <div className="form-field">
            <label htmlFor="body">
              {draft.kind === "made_this"
                ? "What did you make?"
                : "Hear me out…"}
            </label>
            <textarea
              id="body"
              required
              minLength={20}
              maxLength={5000}
              rows={9}
              value={draft.body}
              onChange={(e) => update({ body: e.target.value })}
            />
            <small>
              {draft.kind === "made_this"
                ? "Describe your own contribution, the project’s stage, and what’s pictured. Say if it’s a sketch, render, simulation, or a physical build."
                : "Add your own thought, question, or experiment. A source idea alone isn’t a post."}{" "}
              20–5,000 characters; plain text.
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="projectUrl">Project link (optional)</label>
            <input
              id="projectUrl"
              type="url"
              maxLength={2048}
              placeholder="https://"
              value={draft.projectUrl}
              onChange={(e) => update({ projectUrl: e.target.value })}
            />
            <small>
              One HTTPS link. We show its hostname and don’t load a preview.
            </small>
          </div>
          <fieldset>
            <legend className="field-label">Images (optional)</legend>
            <p className="tiny">
              Up to four JPEG, PNG, or static WebP images, 3 MiB each. Every
              image submission goes to a human reviewer.
            </p>
            <div className="upload-list">
              {assets.map((asset, index) => (
                <div className="upload-item" key={asset.id}>
                  <img
                    src={`/api/media/${asset.id}/thumb`}
                    alt={asset.altText || "Your sanitized upload"}
                  />
                  <div className="form-field">
                    <label htmlFor={`alt-${asset.id}`}>
                      Describe image {index + 1}
                    </label>
                    <input
                      id={`alt-${asset.id}`}
                      minLength={10}
                      maxLength={300}
                      required
                      value={asset.altText}
                      onChange={(e) =>
                        setAssets((all) =>
                          all.map((a) =>
                            a.id === asset.id
                              ? { ...a, altText: e.target.value }
                              : a,
                          ),
                        )
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="tool-button"
                    onClick={() =>
                      setAssets((all) => all.filter((a) => a.id !== asset.id))
                    }
                  >
                    Remove from this submission
                  </button>
                </div>
              ))}
            </div>
            {session?.uploadsEnabled && signedIn && assets.length < 4 ? (
              <>
                <Turnstile
                  siteKey={session.turnstileSiteKey}
                  action="upload"
                  nonce={nonce}
                  onToken={setToken}
                  resetKey={challenge}
                />
                <div className="form-field">
                  <label htmlFor="image-upload">
                    {uploading ? "Processing your image…" : "Choose one image"}
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading || !token}
                    onChange={(e) => {
                      void upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="tiny">
                Image uploads are currently unavailable. Text-only thoughts are
                welcome when posting is open.
              </p>
            )}
          </fieldset>
          <Feedback error={error} />
          <p className="tiny">
            {stored
              ? "Unsent text is saved in this tab for up to 24 hours and cleared after submission or sign-out. Images aren’t saved in your browser draft."
              : "This browser cannot save your draft. Keep this tab open until you submit."}
          </p>
          <div className="form-actions">
            <button
              className="button primary"
              disabled={!allowed || busy || uploading}
            >
              {busy
                ? "Submitting…"
                : postId
                  ? "Submit this revision"
                  : "Share your thought"}
            </button>
            <Link className="text-link" href="/community-rules">
              Community rules
            </Link>
          </div>
          <p className="tiny">
            The server will confirm whether your thought is published or waiting
            for review.
          </p>
        </form>
      )}
      {!draft && <p className="loading-line">Preparing your draft…</p>}
    </>
  );
}
