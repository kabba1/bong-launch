"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SessionAccess, useSession } from "@/features/auth/SessionAccess";
import { ModerationNavigation } from "./ModerationNavigation";

interface MemberState {
  id: string;
  handle: string;
  displayName: string;
  state: string;
  trustedText: boolean;
  suspensionUntil?: string | null;
}
const actionLabels: Record<string, string> = {
  trust: "Grant trusted text",
  untrust: "Remove trusted text",
  suspend: "Suspend member",
  unsuspend: "End suspension",
  ban: "Permanently ban",
  unban: "Reverse ban",
  "hide-content": "Hide published contributions",
};

function MemberControls({
  userId,
  session,
}: {
  userId: string;
  session: Session;
}) {
  const [member, setMember] = useState<MemberState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setMember(
          (await api<MemberState>(`/moderation/members/${userId}`, { signal }))
            .data,
        );
        setError(null);
      } catch (failure) {
        if (!(failure instanceof Error && failure.name === "AbortError"))
          setError(failure);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [userId],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function act(action: string) {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await api(`/moderation/members/${userId}/status`, {
        method: "POST",
        body: {
          action,
          reason,
          ...(action === "suspend" && until
            ? { until: new Date(until).toISOString() }
            : {}),
        },
      });
      setMessage(
        `${actionLabels[action]}: the action was recorded for @${member?.handle}.`,
      );
      setReason("");
      await load();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const isSelf = session.user?.id === userId;
  const allowed =
    member && !["deleting", "deleted"].includes(member.state)
      ? [
          ...(member.state === "active"
            ? [member.trustedText ? "untrust" : "trust", "suspend"]
            : []),
          ...(member.state === "suspended" ? ["unsuspend"] : []),
          ...(session.role === "admin"
            ? [member.state === "banned" ? "unban" : "ban"]
            : []),
          "hide-content",
        ]
      : [];
  return (
    <div className="flow">
      <Feedback error={error} />
      <button
        className="button small quiet"
        disabled={busy || loading}
        onClick={() => {
          setLoading(true);
          void load();
        }}
      >
        Refresh member state
      </button>
      {loading && (
        <p className="loading-line" role="status">
          Loading authorized member information…
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {member && (
        <>
          <section className="form-card flow">
            <p className="eyebrow">Member review</p>
            <h2>@{member.handle}</h2>
            <p>{member.displayName}</p>
            <p>
              <span className="badge">{member.state}</span> ·{" "}
              {member.trustedText
                ? "Trusted text publication"
                : "Text requires review"}
            </p>
            {member.suspensionUntil && (
              <p>
                Suspended until{" "}
                {new Date(member.suspensionUntil).toLocaleString()}
              </p>
            )}
            <Link href={`/members/${member.handle}`}>View public profile</Link>
            <p className="error-id">Member ID: {member.id}</p>
          </section>
          <section className="form-card">
            <h2>Account actions</h2>
            <p>
              Trust changes affect text only. Images still need independent
              human review. A ban changes account access; hiding published
              contributions is a separate action.
            </p>
            {isSelf && (
              <p className="notice">
                You cannot grant yourself trust or use these member controls on
                your own account.
              </p>
            )}
            <div className="form-field">
              <label htmlFor="reason">Reason for this action</label>
              <textarea
                id="reason"
                minLength={3}
                maxLength={2000}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <small>
                3–1,000 characters. The action and reason are recorded in the
                audit history.
              </small>
            </div>
            <div className="form-field">
              <label htmlFor="suspension-until">
                Suspension ends{" "}
                <span className="muted">(required when suspending)</span>
              </label>
              <input
                id="suspension-until"
                type="datetime-local"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
              />
              <small>
                Shown in your current timezone. This field applies only to a
                suspension.
              </small>
            </div>
            <div className="form-actions">
              {allowed.map((action) => (
                <ConfirmDialog
                  key={action}
                  label={actionLabels[action]!}
                  title={`${actionLabels[action]} for @${member.handle}?`}
                  disabled={
                    busy ||
                    isSelf ||
                    [...reason.trim()].length < 3 ||
                    [...reason.trim()].length > 1000 ||
                    (action === "suspend" && !until)
                  }
                  onConfirm={() => void act(action)}
                >
                  <p>
                    {action === "hide-content"
                      ? "This explicitly hides this member’s currently published contributions. It does not rewrite their words."
                      : action === "ban"
                        ? "This removes community write access and revokes registered sessions. Existing public contributions need a separate content decision."
                        : action === "trust"
                          ? "Eligible text may publish immediately when review-all mode is off. Images still require review."
                          : "Apply the selected account status change with the reason you entered."}
                  </p>
                </ConfirmDialog>
              ))}
            </div>
            <p className="tiny">
              Staff roles and recovery factors can only be changed through the
              owner-run secure procedure.
            </p>
          </section>
        </>
      )}
      <Link className="text-link" href="/moderation">
        ← Back to queues
      </Link>
    </div>
  );
}

export function MemberReview({ userId }: { userId: string }) {
  const state = useSession();
  return (
    <SessionAccess state={state} returnTo="/moderation" staff>
      {(session) => (
        <>
          <ModerationNavigation admin={session.role === "admin"} />
          <MemberControls userId={userId} session={session} />
        </>
      )}
    </SessionAccess>
  );
}
