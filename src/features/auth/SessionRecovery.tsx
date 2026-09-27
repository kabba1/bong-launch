"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";

/** A cookie-writing API response refreshes credentials; RSC never refreshes them. */
export function SessionRecovery({ path }: { path: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "sign-in" | "failed">(
    "checking",
  );
  const [error, setError] = useState<unknown>(null);
  const recover = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await api<Session>("/session", { signal });
        if (signal?.aborted) return;
        if (!response.data.user) {
          setPhase("sign-in");
          return;
        }
        // This marker only suppresses another recovery gate. All reads still
        // verify the real session, actor and record visibility on the server.
        router.replace(`${path}?authRecovery=1`);
        router.refresh();
      } catch (failure) {
        if (signal?.aborted) return;
        setError(failure);
        setPhase("failed");
      }
    },
    [path, router],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void recover(controller.signal);
    });
    return () => controller.abort();
  }, [recover]);
  return (
    <section className="page narrow">
      <h1>Checking your session.</h1>
      <p>
        This page may need a current sign-in. No private content is shown until
        access is confirmed.
      </p>
      {phase === "checking" ? (
        <p className="loading-line" role="status">
          Checking your account before trying the page again…
        </p>
      ) : (
        <>
          <Feedback error={error} />
          <div className="form-actions">
            <Link
              className="button primary"
              href={`/sign-in?returnTo=${encodeURIComponent(path)}`}
            >
              Sign in to continue
            </Link>
            <button
              className="button quiet"
              onClick={() => {
                setError(null);
                setPhase("checking");
                void recover();
              }}
            >
              Try checking again
            </button>
            <Link className="text-link" href="/board">
              Back to the board
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/** Drop the retry marker only after the server actually renders an allowed post. */
export function ClearSessionRecovery() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("authRecovery") !== "1") return;
    url.searchParams.delete("authRecovery");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);
  return null;
}
