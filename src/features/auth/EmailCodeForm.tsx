"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { Turnstile } from "@/components/Turnstile";
import { safeAccountDestination } from "./SessionAccess";

export function EmailCodeForm({
  siteKey,
  nonce,
  returnTo,
  reauthenticate = false,
  onVerified,
}: {
  siteKey?: string;
  nonce?: string;
  returnTo?: string;
  reauthenticate?: boolean;
  onVerified?: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [challenge, setChallenge] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const codeInput = useRef<HTMLInputElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cooldownUntil) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);
  useEffect(() => {
    if (sent) codeInput.current?.focus();
  }, [sent]);
  useEffect(() => {
    if (error) feedback.current?.focus();
  }, [error]);

  async function requestCode() {
    if (busy || remaining > 0 || !captchaToken) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await api<{ message: string; resendAfter: number }>(
        "/auth/request-code",
        { method: "POST", body: { email, captchaToken } },
      );
      setSent(true);
      setCode("");
      setMessage(result.data.message);
      setCooldownUntil(Date.now() + 60_000);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setChallenge((value) => value + 1);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      if (reauthenticate) {
        await api("/auth/reauthenticate", {
          method: "POST",
          body: { email, code },
        });
        setCode("");
        setMessage("Your identity is confirmed for the next 10 minutes.");
        onVerified?.();
      } else {
        const result = await api<{ onboarded: boolean; returnTo: string }>(
          "/auth/verify-code",
          {
            method: "POST",
            body: { email, code, returnTo: safeAccountDestination(returnTo) },
          },
        );
        router.replace(
          result.data.onboarded
            ? safeAccountDestination(result.data.returnTo)
            : `/onboarding?returnTo=${encodeURIComponent(safeAccountDestination(returnTo))}`,
        );
        router.refresh();
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-card">
      {reauthenticate && (
        <>
          <h2>Confirm it’s you</h2>
          <p className="muted">
            Request a fresh code for the email address on this account. The code
            expires after 10 minutes.
          </p>
        </>
      )}
      <div ref={feedback} tabIndex={-1}>
        <Feedback error={error} />
      </div>
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void requestCode();
        }}
      >
        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            disabled={sent || busy}
            onChange={(event) => setEmail(event.target.value)}
          />
          <small>
            Use an address you can access. No password or wallet is needed.
          </small>
        </div>
        <Turnstile
          siteKey={siteKey}
          action="auth"
          nonce={nonce}
          onToken={setCaptchaToken}
          resetKey={challenge}
        />
        <div className="form-actions">
          <button
            className="button primary"
            disabled={busy || !captchaToken || remaining > 0 || !email.trim()}
            type="submit"
          >
            {busy && !sent
              ? "Requesting code…"
              : sent
                ? remaining > 0
                  ? `Resend in ${remaining}s`
                  : "Resend code"
                : "Send a sign-in code"}
          </button>
          {sent && (
            <button
              className="button quiet"
              type="button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setMessage("");
                setError(null);
              }}
            >
              Change email
            </button>
          )}
        </div>
      </form>
      {sent && (
        <form className="flow" onSubmit={verify}>
          <div className="form-field">
            <label htmlFor="code">Six-digit email code</label>
            <input
              ref={codeInput}
              id="code"
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
              aria-describedby="email-code-help"
            />
            <small id="email-code-help">
              Paste the complete code from your email. If it has expired,
              request another.
            </small>
          </div>
          <button
            type="submit"
            className="button dark"
            disabled={busy || !/^\d{6}$/.test(code)}
          >
            {busy
              ? "Checking code…"
              : reauthenticate
                ? "Confirm identity"
                : "Verify and continue"}
          </button>
        </form>
      )}
      {!reauthenticate && (
        <p className="tiny">
          Signing in does not publish anything. Your unsent board draft stays in
          this browser tab.
        </p>
      )}
    </div>
  );
}
