import type { Actor } from "../db/database";
import { ApiError, unauthorized } from "../security/errors";
import { uuid } from "../security/schemas";

export interface SessionState {
  userId: string;
  sessionId: string;
  onboarded: boolean;
  member: {
    handle: string;
    displayName: string;
    bio: string;
    version: number;
    state: string;
    trustedText: boolean;
  } | null;
  staffRole: "moderator" | "admin" | null;
  approvedFactorIds: string[];
  mfaFactorId?: string | null;
  stepUpAt?: string | null;
  reauthenticatedAt?: string | null;
  features?: Record<string, boolean>;
}
/** Input must be the result of provider getClaims, never decoded request JSON. */
export function actorFromVerifiedClaims(
  claims: Record<string, unknown>,
  requestId: string,
  providerOrigin: string,
  now = Math.floor(Date.now() / 1000),
): Actor {
  if (
    !uuid.safeParse(claims.sub).success ||
    !uuid.safeParse(claims.session_id).success ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    claims.iss !== `${providerOrigin}/auth/v1` ||
    claims.is_anonymous === true ||
    !(
      claims.aud === "authenticated" ||
      (Array.isArray(claims.aud) && claims.aud.includes("authenticated"))
    ) ||
    !["aal1", "aal2"].includes(String(claims.aal))
  )
    throw unauthorized();
  return {
    userId: claims.sub as string,
    sessionId: claims.session_id as string,
    aal: claims.aal as "aal1" | "aal2",
    requestId,
  };
}
type MfaState = Pick<
  SessionState,
  "staffRole" | "approvedFactorIds" | "mfaFactorId" | "stepUpAt"
>;
export function requireMfa(
  state: MfaState,
  aal: "aal1" | "aal2",
  fresh: boolean,
  now = Date.now(),
) {
  const timestamp = state.stepUpAt ? Date.parse(state.stepUpAt) : NaN;
  if (
    !state.staffRole ||
    aal !== "aal2" ||
    !state.mfaFactorId ||
    !state.approvedFactorIds.includes(state.mfaFactorId) ||
    !Number.isFinite(timestamp) ||
    timestamp > now + 30_000 ||
    (fresh && now - timestamp > 15 * 60_000)
  )
    throw new ApiError(
      403,
      "MFA_REQUIRED",
      "Verify your approved authenticator to continue.",
    );
}
export function requireRecentReauthentication(
  state: Pick<SessionState, "reauthenticatedAt">,
  now = Date.now(),
) {
  const timestamp = state.reauthenticatedAt
    ? Date.parse(state.reauthenticatedAt)
    : NaN;
  if (
    !Number.isFinite(timestamp) ||
    timestamp > now + 30_000 ||
    now - timestamp > 10 * 60_000
  )
    throw new ApiError(
      403,
      "REAUTH_REQUIRED",
      "Confirm a fresh email code before continuing.",
    );
}
