"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setSession((await api<Session>("/session", { signal })).data);
      setError(null);
    } catch (failure) {
      if (!(failure instanceof Error && failure.name === "AbortError"))
        setError(failure);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void refresh(controller.signal);
    });
    return () => controller.abort();
  }, [refresh]);
  return { session, loading, error, refresh };
}

export function SessionAccess({
  state,
  returnTo,
  staff = false,
  admin = false,
  children,
}: {
  state: ReturnType<typeof useSession>;
  returnTo: string;
  staff?: boolean;
  admin?: boolean;
  children: (session: Session) => React.ReactNode;
}) {
  if (state.loading)
    return (
      <p className="loading-line" role="status">
        Checking your account…
      </p>
    );
  if (state.error)
    return (
      <>
        <Feedback error={state.error} />
        <button className="button quiet" onClick={() => void state.refresh()}>
          Try again
        </button>
      </>
    );
  if (!state.session?.user)
    return (
      <section className="empty-state">
        <h2>Sign in to continue</h2>
        <p>This area belongs to your account.</p>
        <Link
          className="button primary"
          href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        >
          Sign in
        </Link>
      </section>
    );
  if (
    (staff && !state.session.role) ||
    (admin && state.session.role !== "admin")
  )
    return (
      <section className="empty-state">
        <h2>This area needs staff access</h2>
        <p>Your account does not have the required permission.</p>
        <Link className="button quiet" href="/account">
          Back to your account
        </Link>
      </section>
    );
  if ((staff || admin) && state.session.mfaRequired)
    return (
      <section className="empty-state">
        <h2>Verify your staff access</h2>
        <p>
          Use your approved authenticator before viewing private submissions or
          taking moderation actions.
        </p>
        <Link className="button primary" href="/account/security">
          Open account security
        </Link>
      </section>
    );
  return children(state.session);
}

export function safeAccountDestination(value: string | undefined): string {
  if (
    typeof value !== "string" ||
    !value ||
    /[\\\p{Cc}]/u.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/account";
  try {
    const url = new URL(value, "https://bong.invalid");
    if (url.origin !== "https://bong.invalid" || url.username || url.password)
      return "/account";
    if (
      [
        "/account",
        "/account/security",
        "/account/data",
        "/board",
        "/moderation",
      ].includes(url.pathname) &&
      !url.search
    )
      return url.pathname;
    if (url.pathname === "/board/new") {
      const source = url.searchParams.get("sourceIdeaId");
      return source && /^BONG-\d{4}$/.test(source)
        ? `/board/new?sourceIdeaId=${source}`
        : "/board/new";
    }
    if (
      /^\/board\/[0-9a-f-]{36}(?:\/edit)?$/i.test(url.pathname) &&
      !url.search
    )
      return url.pathname;
  } catch {
    /* Invalid paths fall back to the account home. */
  }
  return "/account";
}

export function clearComposerDrafts() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith("bong:") && /draft|composer/.test(key))
        sessionStorage.removeItem(key);
    }
  } catch {
    /* Sign-out must still finish when local storage is unavailable. */
  }
}

export function useRecentConfirmation() {
  const [recent, setRecent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRecent(true);
    timer.current = setTimeout(() => setRecent(false), 600_000);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { recent, confirm };
}
