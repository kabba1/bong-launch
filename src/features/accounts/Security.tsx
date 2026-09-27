"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmailCodeForm } from "@/features/auth/EmailCodeForm";
import {
  clearComposerDrafts,
  SessionAccess,
  useSession,
  useRecentConfirmation,
} from "@/features/auth/SessionAccess";

function Authenticator({
  session,
  refresh,
}: {
  session: Session;
  refresh: () => Promise<void>;
}) {
  const approved = session.approvedFactorIds ?? [];
  const [factor, setFactor] = useState(approved[0] ?? "");
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    totp: { qr_code: string; secret: string; uri: string };
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  async function enroll() {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await api<NonNullable<typeof enrollment>>(
        "/auth/mfa/enroll",
        { method: "POST", body: {} },
      );
      setEnrollment(result.data);
      setFactor(result.data.factorId);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await api("/auth/mfa/verify", {
        method: "POST",
        body: { factorId: factor, code },
      });
      setCode("");
      setEnrollment(null);
      setMessage(
        "Authenticator verified. Staff actions are available for the next 15 minutes.",
      );
      await refresh();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="form-card flow">
      <h2>Staff authenticator</h2>
      <p>
        Your approved authenticator protects private moderation data. Staff
        actions require a verification within the last 15 minutes.
      </p>
      <Feedback error={error} />
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {approved.length > 0 && (
        <p className="notice">
          {session.mfaRequired
            ? "Verify your existing approved authenticator to continue."
            : "Your staff verification is current."}{" "}
          An email code alone cannot replace an approved authenticator.
        </p>
      )}
      {approved.length === 0 && !enrollment && (
        <>
          <p>
            First enrollment needs owner-authorized staff setup. Your role
            cannot be used until the provider and application approve this
            factor.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void enroll()}
          >
            {busy ? "Preparing enrollment…" : "Set up an authenticator"}
          </button>
        </>
      )}
      {enrollment && (
        <div className="notice">
          <h3>Save this in your authenticator app</h3>
          <p>
            Add this secret as a time-based authenticator account. Keep it
            private; it is only shown during this enrollment.
          </p>
          <p className="error-id">
            <code>{enrollment.totp.secret}</code>
          </p>
          {enrollment.totp.qr_code.startsWith("<svg") && (
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.totp.qr_code)}`}
              alt="Scan this private setup code with your authenticator app"
              width={220}
              height={220}
            />
          )}
        </div>
      )}
      {(approved.length > 0 || enrollment) && (
        <form onSubmit={verify}>
          {approved.length > 1 && !enrollment && (
            <div className="form-field">
              <label htmlFor="factorId">Approved authenticator</label>
              <select
                id="factorId"
                value={factor}
                onChange={(event) => setFactor(event.target.value)}
              >
                {approved.map((id, index) => (
                  <option value={id} key={id}>
                    Authenticator {index + 1} · {id.slice(-8)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="authenticator-code">
              Six-digit authenticator code
            </label>
            <input
              id="authenticator-code"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>
          <button
            className="button dark"
            disabled={busy || !factor || !/^\d{6}$/.test(code)}
          >
            {busy ? "Verifying…" : "Verify authenticator"}
          </button>
        </form>
      )}
      <p className="tiny">
        Lost your authenticator? Use the owner-run recovery procedure. There is
        no email-only factor reset or self-service removal.{" "}
        <Link href="/contact">Contact the operator</Link>.
      </p>
    </section>
  );
}

export function Security({
  siteKey,
  nonce,
}: {
  siteKey?: string;
  nonce?: string;
}) {
  const state = useSession();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const confirmation = useRecentConfirmation();
  async function signOut(all: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(all ? "/auth/sign-out-all" : "/auth/sign-out", {
        method: "POST",
        body: {},
      });
      clearComposerDrafts();
      router.replace("/sign-in");
      router.refresh();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SessionAccess state={state} returnTo="/account/security">
      {(session) => (
        <div className="flow">
          <Feedback error={error} />
          <section className="form-card">
            <h2>This session</h2>
            <p className="muted">
              Sign out on this browser. Unsent local composer drafts will be
              cleared.
            </p>
            <div className="form-actions">
              <button
                className="button quiet"
                disabled={busy}
                onClick={() => void signOut(false)}
              >
                {busy ? "Signing out…" : "Sign out here"}
              </button>
            </div>
          </section>
          {session.role && (
            <Authenticator session={session} refresh={() => state.refresh()} />
          )}
          <EmailCodeForm
            siteKey={siteKey || session.turnstileSiteKey}
            nonce={nonce}
            reauthenticate
            onVerified={confirmation.confirm}
          />
          <section className="form-card">
            <h2>Sign out everywhere</h2>
            <p>
              Confirm a fresh email code above before revoking all registered
              sessions. Staff must also have current authenticator verification.
            </p>
            <div className="form-actions">
              <ConfirmDialog
                label="Sign out all sessions"
                title="Sign out on every device?"
                disabled={
                  busy ||
                  !confirmation.recent ||
                  !!(session.role && session.mfaRequired)
                }
                onConfirm={() => void signOut(true)}
              >
                <p>
                  This ends every registered BONG session, including this one.
                  You will need a new email code to sign in again.
                </p>
              </ConfirmDialog>
            </div>
          </section>
        </div>
      )}
    </SessionAccess>
  );
}
