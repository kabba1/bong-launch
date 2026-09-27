"use client";
import Link from "next/link";
import { ApiError } from "@/lib/api-client";
export function Feedback({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : null;
  return (
    <div className="notice error" role="alert" tabIndex={-1}>
      <p>
        {error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      {e?.fields && (
        <ul>
          {Object.entries(e.fields).map(([field, message]) => (
            <li key={field}>
              <a href={`#${field}`}>{message}</a>
            </li>
          ))}
        </ul>
      )}
      {e?.status === 401 && <Link href="/sign-in">Sign in to continue</Link>}
      {e?.code?.includes("MFA") && (
        <Link href="/account/security">Verify your staff access</Link>
      )}
      {e?.requestId && <p className="error-id">Reference: {e.requestId}</p>}
    </div>
  );
}
