"use client";
import { useRef, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { Turnstile } from "@/components/Turnstile";
import { Icon } from "@/components/Icon";
const reasons = [
  ["spam_scam", "Spam or scam"],
  ["harassment", "Harassment"],
  ["privacy", "Privacy concern"],
  ["dangerous_illegal", "Dangerous or illegal content"],
  ["misleading_authorship", "Misleading authorship"],
  ["factual_correction", "Factual correction"],
  ["copyright_rights", "Copyright or rights"],
  ["other", "Something else"],
];
export function ReportForm({
  targetType,
  targetId,
}: {
  targetType: "post" | "comment" | "member" | "idea" | "timeline";
  targetId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [reset, setReset] = useState(0);
  async function open() {
    setError(null);
    setSuccess(false);
    dialog.current?.showModal();
    try {
      setSession((await api<Session>("/session")).data);
    } catch (e) {
      setError(e);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/reports", {
        method: "POST",
        body: {
          targetType,
          targetId,
          reason: form.get("reason"),
          detail: form.get("detail"),
          ...(session?.user ? {} : { captchaToken: token }),
        },
      });
      setSuccess(true);
    } catch (e) {
      setError(e);
      setReset((r) => r + 1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="tool-button" onClick={open}>
        Report / suggest a correction
      </button>
      <dialog ref={dialog} aria-labelledby={`report-title-${targetId}`}>
        <div className="dialog-top">
          <h2 id={`report-title-${targetId}`}>Something we should look at?</h2>
          <button
            className="icon-button"
            aria-label="Close report"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        {success ? (
          <p role="status" className="notice success">
            Your report has been received for human review. Thank you for
            letting us know.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p className="tiny">
              Reports are private. Reporting doesn’t automatically remove
              content.
            </p>
            <div className="form-field">
              <label htmlFor={`reason-${targetId}`}>What’s the concern?</label>
              <select name="reason" id={`reason-${targetId}`} required>
                {reasons.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor={`detail-${targetId}`}>Details (optional)</label>
              <textarea
                name="detail"
                id={`detail-${targetId}`}
                maxLength={1000}
              />
            </div>
            {session && !session.user && (
              <Turnstile
                siteKey={session.turnstileSiteKey}
                action="report"
                onToken={setToken}
                resetKey={reset}
              />
            )}
            <Feedback error={error} />
            <button
              className="button primary"
              disabled={busy || !session || (!session.user && !token)}
            >
              {busy ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
