import "server-only";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { appConfig, providerConfig, required } from "../config/env";
import { ApiError, unauthorized, unavailable } from "../security/errors";
import { actorFromVerifiedClaims, type SessionState } from "./session";
import { dbAction, type Actor } from "../db/database";
import { CookieJar } from "./cookies";

const timeoutFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
export function authClient() {
  const c = providerConfig();
  return createClient(c.url, c.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: timeoutFetch },
  });
}
function authFailure(error: { status?: number; code?: string } | null): never {
  if (!error?.status || error.status >= 500) throw unavailable();
  if (error.status === 429)
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Please wait before trying again.",
      undefined,
      60,
    );
  throw new ApiError(
    400,
    "INVALID_CODE",
    "The code is invalid or expired. Request a new one.",
  );
}
function sessionFailure(
  error: { status?: number; code?: string; name?: string } | null,
): never {
  // Only an explicit credential rejection invalidates browser credentials.
  // SDK transport failures can carry status 0 or no status; unknown/malformed
  // upstream responses remain unavailable instead of signing the user out.
  if (
    error?.name === "AuthRetryableFetchError" ||
    error?.status === 429 ||
    (error?.status !== undefined && error.status >= 500)
  )
    throw unavailable();
  if (
    [
      "AuthInvalidJwtError",
      "AuthInvalidCredentialsError",
      "AuthSessionMissingError",
    ].includes(error?.name || "") ||
    [
      "bad_jwt",
      "invalid_credentials",
      "no_authorization",
      "user_not_found",
      "user_banned",
      "session_not_found",
      "session_expired",
      "refresh_token_not_found",
      "refresh_token_already_used",
      "unexpected_audience",
      "email_not_confirmed",
    ].includes(error?.code || "")
  )
    throw unauthorized();
  throw unavailable();
}
export type AuthContext = {
  actor: Actor;
  state: SessionState | null;
  client: SupabaseClient | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export async function verifyToken(
  client: SupabaseClient,
  accessToken: string,
  requestId: string,
) {
  const result = await client.auth.getClaims(accessToken);
  if (result.error || !result.data?.claims) {
    sessionFailure(result.error);
  }
  return actorFromVerifiedClaims(
    result.data.claims as unknown as Record<string, unknown>,
    requestId,
    providerConfig().url,
  );
}

export async function loadAuth(
  jar: CookieJar,
  requestId: string,
  options: { refresh?: boolean } = {},
): Promise<AuthContext> {
  const anonymous = {
    actor: { userId: null, sessionId: null, aal: "aal1" as const, requestId },
    state: null,
    client: null,
    accessToken: null,
    refreshToken: null,
  };
  let access = jar.get("access");
  let refresh = jar.get("refresh");
  if (!access && !refresh) return anonymous;
  const client = authClient();
  let actor: Actor;
  let renewed: Session | null = null;
  try {
    if (!access) throw unauthorized();
    actor = await verifyToken(client, access, requestId);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      !refresh ||
      options.refresh === false
    )
      throw error;
    const result = await client.auth.refreshSession({ refresh_token: refresh });
    if (result.error || !result.data.session) sessionFailure(result.error);
    renewed = result.data.session;
    access = renewed.access_token;
    refresh = renewed.refresh_token;
    actor = await verifyToken(client, access, requestId);
  }
  // Registration, account state, absolute expiry and inactivity are checked after refresh and before cookies.
  const state = await dbAction<SessionState>(actor, "session.get", {});
  if (
    !state ||
    state.userId !== actor.userId ||
    state.sessionId !== actor.sessionId
  )
    throw unauthorized();
  if (renewed) jar.auth(renewed);
  return {
    actor,
    state,
    client,
    accessToken: access!,
    refreshToken: refresh || null,
  };
}

export async function providerSession(context: AuthContext) {
  if (!context.client || !context.accessToken || !context.refreshToken)
    throw unauthorized();
  const result = await context.client.auth.setSession({
    access_token: context.accessToken,
    refresh_token: context.refreshToken,
  });
  if (result.error || !result.data.session) sessionFailure(result.error);
  return context.client;
}
export async function freshUser(context: AuthContext) {
  if (!context.client || !context.accessToken || !context.actor.userId)
    throw unauthorized();
  const result = await context.client.auth.getUser(context.accessToken);
  if (result.error || !result.data.user) {
    sessionFailure(result.error);
  }
  if (
    result.data.user.id !== context.actor.userId ||
    !result.data.user.email_confirmed_at
  )
    throw unauthorized();
  return result.data.user;
}
export async function requestCode(
  email: string,
  captchaToken: string,
  registrations: boolean,
) {
  // Provider consumes this one-use token; application must not pre-verify it.
  required("TURNSTILE_SITE_KEY");
  if (process.env.PROVIDER_CAPTCHA_ENABLED !== "true") throw unavailable();
  const client = authClient();
  const result = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: registrations, captchaToken },
  });
  if (
    result.error &&
    !["user_not_found", "signup_disabled"].includes(result.error.code || "")
  ) {
    if (result.error.status === 429)
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Please wait before trying again.",
        undefined,
        60,
      );
    throw unavailable();
  }
  return {
    message: "If this address can sign in, a code is on its way.",
    resendAfter: 60,
  };
}
export async function verifyCode(
  email: string,
  code: string,
  requestId: string,
) {
  const client = authClient();
  const result = await client.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (result.error || !result.data.session) authFailure(result.error);
  const session = result.data.session!;
  const actor = await verifyToken(client, session.access_token, requestId);
  const user = await client.auth.getUser(session.access_token);
  if (user.error || !user.data.user) sessionFailure(user.error);
  if (user.data.user?.id !== actor.userId || !user.data.user.email_confirmed_at)
    throw unauthorized();
  return { client, session, actor, user: user.data.user };
}
export async function signOutProvider(context: AuthContext, all: boolean) {
  if (!context.client || !context.accessToken) return;
  // Revocation is already committed locally. Failure cannot reactivate the application session.
  try {
    await context.client.auth.admin.signOut(
      context.accessToken,
      all ? "global" : "local",
    );
  } catch {
    /* No token/error payload logging. */
  }
}
export async function registerSession(actor: Actor) {
  const config = appConfig();
  return dbAction<SessionState>(actor, "session.register", {
    registrationsEnabled: config.registrationsEnabled,
  });
}
