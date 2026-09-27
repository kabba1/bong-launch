"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmailCodeForm } from "@/features/auth/EmailCodeForm";
import {
  SessionAccess,
  useSession,
  useRecentConfirmation,
} from "@/features/auth/SessionAccess";

interface Job {
  id: string;
  kind: "export" | "deletion";
  status: string;
  phase?: string;
  createdAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  expiresIn?: number;
}

function DataControls({
  siteKey,
  nonce,
  staffMfaRequired,
}: {
  siteKey?: string;
  nonce?: string;
  staffMfaRequired: boolean;
}) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const identity = useRecentConfirmation();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [deleteAccepted, setDeleteAccepted] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api<{ items: Job[] }>("/account/jobs", { signal });
      setJobs(result.data.items);
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
  async function request(kind: "export" | "deletion") {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await api<Job>(
        kind === "export" ? "/account/export" : "/account/delete",
        { method: "POST", body: kind === "export" ? {} : { confirmation } },
      );
      if (!result.data.id)
        throw new Error(
          "The server did not return a request reference. Check your requests before trying again.",
        );
      setJobs((previous) => [
        result.data,
        ...(previous ?? []).filter((job) => job.id !== result.data.id),
      ]);
      if (kind === "deletion") {
        setDeleteAccepted(true);
        setConfirmation("");
      }
      setMessage(
        kind === "export"
          ? `Export request ${result.data.id}: ${result.data.status}.`
          : `Deletion accepted. New community writes are frozen while cleanup runs. Request ${result.data.id}.`,
      );
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  async function check(job: Job) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<Job>(`/account/jobs/${job.id}`);
      setJobs((previous) =>
        (previous ?? []).map((item) =>
          item.id === job.id ? result.data : item,
        ),
      );
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const eligible = identity.recent && !staffMfaRequired && !deleteAccepted;
  return (
    <div className="flow">
      <p className="notice">
        These requests need a fresh email code.{" "}
        {staffMfaRequired && (
          <>
            <Link href="/account/security">
              Verify your staff authenticator
            </Link>{" "}
            before continuing.{" "}
          </>
        )}
        Read the <Link href="/privacy">privacy notice</Link> for approved
        retention and backup details.
      </p>
      <EmailCodeForm
        siteKey={siteKey}
        nonce={nonce}
        reauthenticate
        onVerified={identity.confirm}
      />
      <Feedback error={error} />
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <section className="form-card">
        <h2>Export your data</h2>
        <p>
          Request a private JSON export of your retained profile and
          contributions, plus a media manifest. Other people’s private data,
          reporter identities and staff-only notes are excluded.
        </p>
        <p className="tiny">
          Exports expire after 24 hours. Download links last 60 seconds and can
          be refreshed while the export remains available.
        </p>
        <div className="form-actions">
          <button
            className="button primary"
            disabled={busy || !eligible}
            onClick={() => void request("export")}
          >
            {busy ? "Working…" : "Request an export"}
          </button>
        </div>
      </section>
      <section className="form-card">
        <h2>Delete your account</h2>
        <p>
          Deletion stops new contributions immediately and queues removal of
          your eligible live data and media. Other members’ independent
          contributions stay. Limited retention and backups follow the approved
          privacy notice.
        </p>
        <p>
          If you are the last recovery administrator, ownership must be
          transferred before deletion.
        </p>
        <div className="form-field">
          <label htmlFor="confirmation">
            Type DELETE MY ACCOUNT to confirm
          </label>
          <input
            id="confirmation"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        <ConfirmDialog
          label="Request account deletion"
          title="Delete your BONG account?"
          disabled={busy || !eligible || confirmation !== "DELETE MY ACCOUNT"}
          onConfirm={() => void request("deletion")}
        >
          <p>
            This requests deletion of your account and eligible content. There
            is no member restore option. Cleanup can continue in the background
            after access ends.
          </p>
        </ConfirmDialog>
      </section>
      <section>
        <div className="section-header">
          <h2>Your requests</h2>
          <button
            className="button small quiet"
            disabled={loading || busy}
            onClick={() => {
              setError(null);
              void refresh();
            }}
          >
            Refresh requests
          </button>
        </div>
        {loading ? (
          <p role="status" className="loading-line">
            Loading your data requests…
          </p>
        ) : jobs === null ? null : jobs.length === 0 ? (
          <p className="muted">
            No data requests are recorded for this account.
          </p>
        ) : (
          <div className="job-list">
            {jobs.map((job) => (
              <article className="job-item" key={job.id}>
                <h3>
                  {job.kind === "export"
                    ? "Account export"
                    : "Account deletion"}
                </h3>
                <p>
                  <span className="badge">{job.status}</span>
                  {job.phase && <> · {job.phase.replaceAll("_", " ")}</>}
                </p>
                <p className="error-id">Request: {job.id}</p>
                {job.createdAt && (
                  <p className="tiny">
                    Requested {new Date(job.createdAt).toLocaleString()}
                  </p>
                )}
                {job.status === "failed" && (
                  <p className="notice error">
                    This request needs operator attention.{" "}
                    <Link href="/contact">Contact support</Link> with its
                    reference.
                  </p>
                )}
                <div className="form-actions">
                  <button
                    className="button small quiet"
                    disabled={busy}
                    onClick={() => void check(job)}
                  >
                    Check status
                    {job.kind === "export" && job.status === "complete"
                      ? " / refresh download"
                      : ""}
                  </button>
                  {job.downloadUrl && (
                    <a
                      className="button small dark"
                      href={job.downloadUrl}
                      rel="noreferrer"
                      download
                    >
                      Download private export
                    </a>
                  )}
                </div>
                {job.downloadUrl && (
                  <p className="tiny">
                    This link expires after 60 seconds. Refresh it if needed.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function AccountData({
  siteKey,
  nonce,
}: {
  siteKey?: string;
  nonce?: string;
}) {
  const state = useSession();
  return (
    <SessionAccess state={state} returnTo="/account/data">
      {(session) => (
        <DataControls
          siteKey={siteKey || session.turnstileSiteKey}
          nonce={nonce}
          staffMfaRequired={!!session.role && !!session.mfaRequired}
        />
      )}
    </SessionAccess>
  );
}
