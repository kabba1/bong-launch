"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import {
  SessionAccess,
  safeAccountDestination,
  useSession,
} from "./SessionAccess";

export function Onboarding({ returnTo }: { returnTo?: string }) {
  const state = useSession();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const errorBox = useRef<HTMLDivElement>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!state.session || busy) return;
    setError(null);
    setBusy(true);
    try {
      await api("/onboarding", {
        method: "POST",
        body: {
          handle,
          displayName,
          rulesVersion: state.session.rulesVersion,
          termsVersion: state.session.termsVersion,
          adultAcknowledged: adult,
        },
      });
      router.replace(safeAccountDestination(returnTo));
      router.refresh();
    } catch (failure) {
      setError(failure);
      requestAnimationFrame(() => errorBox.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <SessionAccess state={state} returnTo="/onboarding">
      {(session) => {
        if (session.onboarded)
          return (
            <section className="empty-state">
              <h2>You’re ready to join in</h2>
              <p>Your community account is already set up.</p>
              <Link
                className="button primary"
                href={safeAccountDestination(returnTo)}
              >
                Continue
              </Link>
            </section>
          );
        const available =
          session.registrationEnabled &&
          !!session.rulesVersion &&
          !!session.termsVersion;
        return (
          <form className="form-card" onSubmit={submit}>
            {!available && (
              <p className="notice">
                New community accounts are currently closed. Registration will
                open after the participation policies and operating arrangements
                are ready.
              </p>
            )}
            <div ref={errorBox} tabIndex={-1}>
              <Feedback error={error} />
            </div>
            <div className="form-field">
              <label htmlFor="handle">Public handle</label>
              <input
                id="handle"
                autoComplete="username"
                pattern="[a-z0-9][a-z0-9_]{2,23}"
                minLength={3}
                maxLength={24}
                required
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                aria-describedby="handle-help"
              />
              <small id="handle-help">
                3–24 lowercase letters, numbers or underscores. Your handle
                stays the same after joining. Staff and site names are reserved.
              </small>
            </div>
            <div className="form-field">
              <label htmlFor="displayName">
                Display name <span className="muted">(optional)</span>
              </label>
              <input
                id="displayName"
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <small>
                Up to 40 characters. This is a public name, not a verified
                identity.
              </small>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                checked={policiesAccepted}
                onChange={(event) => setPoliciesAccepted(event.target.checked)}
              />
              <span>
                I have read and accept the{" "}
                <Link href="/community-rules">community rules</Link> and{" "}
                <Link href="/terms">terms</Link>. I have read the{" "}
                <Link href="/privacy">privacy notice</Link>.
              </span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                checked={adult}
                onChange={(event) => setAdult(event.target.checked)}
              />
              <span>
                I confirm that I meet the adult-participation policy described
                in the community rules. This acknowledgement is not identity or
                age verification.
              </span>
            </label>
            {available && (
              <p className="tiny">
                Your acceptance records the current rules version{" "}
                {session.rulesVersion} and terms version {session.termsVersion}.
              </p>
            )}
            <div className="form-actions">
              <button
                className="button primary"
                disabled={busy || !available || !policiesAccepted || !adult}
                type="submit"
              >
                {busy ? "Creating your profile…" : "Join the community"}
              </button>
            </div>
          </form>
        );
      }}
    </SessionAccess>
  );
}
