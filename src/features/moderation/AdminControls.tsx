"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Feedback } from "@/components/Feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SessionAccess, useSession } from "@/features/auth/SessionAccess";
import { ModerationNavigation } from "./ModerationNavigation";

interface Feature {
  name: string;
  value: boolean;
  version: number;
}
interface AuditItem {
  id: string;
  actorId: string | null;
  actorRole: string;
  targetType: string;
  targetId: string;
  revisionId?: string | null;
  action: string;
  reason: string;
  privateNote?: string | null;
  previousState?: string | null;
  newState?: string | null;
  requestId: string;
  createdAt: string;
}
const names: Record<string, string> = {
  posting_enabled: "Posting",
  uploads_enabled: "Image uploads",
  registrations_enabled: "New registrations",
  review_everything: "Review every submission",
};

function FeatureSettings() {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setFeatures(
        (await api<{ items: Feature[] }>("/admin/features", { signal })).data
          .items,
      );
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
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function change(feature: Feature) {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await api("/admin/features", {
        method: "POST",
        body: {
          name: feature.name,
          value: !feature.value,
          expectedVersion: feature.version,
          reason,
        },
      });
      setMessage(
        `${names[feature.name] ?? feature.name} ${feature.value ? "disabled" : "enabled"} in the operational settings.`,
      );
      setReason("");
      await load();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flow">
      <p className="notice">
        These switches are enforced by the server. Closing posting or uploads
        preserves allowed reading. Deployment settings and owner release gates
        can keep a feature closed even when its operational switch is enabled.
      </p>
      <Feedback error={error} />
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <button
        className="button small quiet"
        disabled={loading || busy}
        onClick={() => {
          setLoading(true);
          void load();
        }}
      >
        Reload switches
      </button>
      {loading && (
        <p className="loading-line" role="status">
          Loading current settings…
        </p>
      )}
      <div className="form-field">
        <label htmlFor="reason">Reason for changing a switch</label>
        <textarea
          id="reason"
          required
          minLength={3}
          maxLength={2000}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <small>
          The reason, previous value, new value and acting administrator are
          audited.
        </small>
      </div>
      {features && (
        <div className="job-list">
          {features.map((feature) => (
            <section className="job-item" key={feature.name}>
              <h2>{names[feature.name] ?? feature.name}</h2>
              <p>
                <span className="badge">
                  {feature.value ? "Enabled" : "Disabled"}
                </span>{" "}
                · Version {feature.version}
              </p>
              {feature.name === "review_everything" && (
                <p>
                  When enabled, all text submissions wait for review. Image
                  submissions always wait for review.
                </p>
              )}
              <ConfirmDialog
                label={`${feature.value ? "Disable" : "Enable"} ${names[feature.name]?.toLowerCase() ?? feature.name}`}
                title={`Change ${names[feature.name]?.toLowerCase() ?? feature.name}?`}
                disabled={
                  busy ||
                  [...reason.trim()].length < 3 ||
                  [...reason.trim()].length > 1000
                }
                onConfirm={() => void change(feature)}
              >
                <p>
                  Apply this server setting with the reason above. Changing a
                  switch never automatically publishes an existing pending queue
                  or retries a failed member submission.
                </p>
              </ConfirmDialog>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditHistory() {
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setItems(
        (await api<{ items: AuditItem[] }>("/admin/audit?limit=50", { signal }))
          .data.items,
      );
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
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  const visible = items?.filter(
    (item) =>
      !filter ||
      `${item.action} ${item.targetType} ${item.targetId} ${item.actorId ?? ""}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
  );
  return (
    <div className="flow">
      <p className="muted">
        The latest 50 recorded actions. Private audit details are restricted to
        authorized administrators.
      </p>
      <div className="form-field">
        <label htmlFor="audit-filter">Filter these loaded actions</label>
        <input
          id="audit-filter"
          type="search"
          maxLength={100}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Action, target type, target ID, or actor ID"
        />
      </div>
      <button
        className="button small quiet"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          void load();
        }}
      >
        Refresh audit history
      </button>
      <Feedback error={error} />
      {loading && (
        <p className="loading-line" role="status">
          Loading protected audit history…
        </p>
      )}
      {visible &&
        (visible.length === 0 ? (
          <section className="empty-state">
            <h2>
              {filter
                ? "No loaded actions match"
                : "No recorded actions returned"}
            </h2>
            <p>
              {filter
                ? "Clear the filter to see this page of history."
                : "Actions appear here after they have actually been recorded."}
            </p>
            {filter && (
              <button className="button quiet" onClick={() => setFilter("")}>
                Clear filter
              </button>
            )}
          </section>
        ) : (
          <div className="audit-list">
            {visible.map((item) => (
              <article className="audit-item" key={item.id}>
                <span className="badge">{item.action}</span>
                <h3>
                  {item.targetType} · {item.targetId}
                </h3>
                <p>{item.reason}</p>
                {item.privateNote && (
                  <p className="notice">Private note: {item.privateNote}</p>
                )}
                <p className="tiny">
                  {item.previousState ?? "No previous state"} →{" "}
                  {item.newState ?? "No new state"}
                </p>
                <p className="tiny">
                  {new Date(item.createdAt).toLocaleString()} · {item.actorRole}{" "}
                  · {item.actorId ?? "No member identity recorded"}
                </p>
                {item.revisionId && (
                  <p className="error-id">Revision: {item.revisionId}</p>
                )}
                <p className="error-id">Request: {item.requestId}</p>
              </article>
            ))}
          </div>
        ))}
    </div>
  );
}

export function AdminControls({ view }: { view: "audit" | "features" }) {
  const state = useSession();
  return (
    <SessionAccess state={state} returnTo="/moderation" admin>
      {() => (
        <>
          <ModerationNavigation admin />
          {view === "audit" ? <AuditHistory /> : <FeatureSettings />}
        </>
      )}
    </SessionAccess>
  );
}
