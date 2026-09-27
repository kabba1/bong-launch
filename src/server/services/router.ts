import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z, type ZodType } from "zod";
import { appConfig, secret } from "../config/env";
import { CookieJar } from "../auth/cookies";
import {
  loadAuth,
  requestCode,
  verifyCode,
  registerSession,
  providerSession,
  freshUser,
  signOutProvider,
  verifyToken,
  type AuthContext,
} from "../auth/provider";
import {
  requireMfa,
  requireRecentReauthentication,
  type SessionState,
} from "../auth/session";
import { dbAction } from "../db/database";
import {
  ApiError,
  unauthorized,
  forbidden,
  unavailable,
} from "../security/errors";
import {
  assertBrowserMutation,
  parseInput,
  readJson,
  safeReturnTo,
} from "../security/boundary";
import { makeCsrfProtection } from "../security/csrf";
import { ipLimit, limit, pseudonym, trustedIp } from "../security/rate-limit";
import { verifyChallenge } from "../security/challenge";
import { authorizeInternal } from "../security/internal";
import * as s from "../security/schemas";
import { recordRequest } from "../observability/events";
import { uploadImage } from "../media/service";
import { signedPrivate } from "../media/storage";
import { issueAuthorizedUrl } from "../media/delivery";
import { runMaintenance } from "./maintenance";
import { readiness } from "./readiness";
import {
  communityEnabled,
  communityDisabledResponse,
} from "../../lib/launch-scope";

type Policy = "public" | "session" | "member" | "staff" | "admin" | "reauth";
type Route = {
  method: string;
  pattern: RegExp;
  name: string;
  policy: Policy;
  schema?: ZodType;
  action?: string;
  status?: number;
  posting?: boolean;
  query?: ZodType;
  keys?: string[];
};
const id = "([0-9a-fA-F-]{36})";
const routes: Route[] = [
  { method: "GET", pattern: /^session$/, name: "session", policy: "public" },
  {
    method: "GET",
    pattern: /^security\/csrf$/,
    name: "csrf",
    policy: "public",
  },
  {
    method: "POST",
    pattern: /^auth\/request-code$/,
    name: "request-code",
    policy: "public",
    schema: s.requestCodeInput,
  },
  {
    method: "POST",
    pattern: /^auth\/verify-code$/,
    name: "verify-code",
    policy: "public",
    schema: s.verifyCodeInput,
  },
  {
    method: "POST",
    pattern: /^auth\/reauthenticate$/,
    name: "reauthenticate",
    policy: "session",
    schema: s.verifyCodeInput,
  },
  {
    method: "POST",
    pattern: /^auth\/sign-out$/,
    name: "sign-out",
    policy: "session",
    schema: s.emptyInput,
  },
  {
    method: "POST",
    pattern: /^auth\/sign-out-all$/,
    name: "sign-out-all",
    policy: "reauth",
    schema: s.emptyInput,
  },
  {
    method: "POST",
    pattern: /^auth\/mfa\/enroll$/,
    name: "mfa-enroll",
    policy: "session",
    schema: s.emptyInput,
  },
  {
    method: "POST",
    pattern: /^auth\/mfa\/verify$/,
    name: "mfa-verify",
    policy: "session",
    schema: s.mfaVerifyInput,
  },
  {
    method: "POST",
    pattern: /^onboarding$/,
    name: "onboarding",
    policy: "session",
    schema: s.onboardingInput,
    action: "onboarding",
    status: 201,
  },
  {
    method: "PATCH",
    pattern: /^account\/profile$/,
    name: "profile-update",
    policy: "member",
    schema: s.profileInput,
    action: "profile.update",
  },
  {
    method: "GET",
    pattern: /^account\/content$/,
    name: "account-content",
    policy: "session",
    query: s.pageQuery,
    action: "account.content",
  },
  {
    method: "GET",
    pattern: /^board\/posts$/,
    name: "post-list",
    policy: "public",
    query: s.listQuery,
    action: "post.list",
  },
  {
    method: "POST",
    pattern: /^board\/posts$/,
    name: "post-create",
    policy: "member",
    schema: s.postInput,
    action: "post.create",
    status: 201,
    posting: true,
  },
  {
    method: "GET",
    pattern: new RegExp(`^board/posts/${id}$`),
    name: "post-get",
    policy: "public",
    action: "post.get",
    keys: ["id"],
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^board/posts/${id}$`),
    name: "post-edit",
    policy: "member",
    schema: s.postEditInput,
    action: "post.edit",
    keys: ["id"],
    posting: true,
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^board/posts/${id}$`),
    name: "post-delete",
    policy: "member",
    schema: s.deleteInput,
    action: "post.delete",
    keys: ["id"],
  },
  {
    method: "GET",
    pattern: new RegExp(`^board/posts/${id}/comments$`),
    name: "comment-list",
    policy: "public",
    query: s.pageQuery,
    action: "comment.list",
    keys: ["postId"],
  },
  {
    method: "POST",
    pattern: new RegExp(`^board/posts/${id}/comments$`),
    name: "comment-create",
    policy: "member",
    schema: s.commentInput,
    action: "comment.create",
    keys: ["postId"],
    status: 201,
    posting: true,
  },
  {
    method: "PATCH",
    pattern: new RegExp(`^board/comments/${id}$`),
    name: "comment-edit",
    policy: "member",
    schema: s.commentEditInput,
    action: "comment.edit",
    keys: ["id"],
    posting: true,
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^board/comments/${id}$`),
    name: "comment-delete",
    policy: "member",
    schema: s.deleteInput,
    action: "comment.delete",
    keys: ["id"],
  },
  {
    method: "POST",
    pattern: /^uploads$/,
    name: "upload",
    policy: "member",
    status: 201,
  },
  {
    method: "DELETE",
    pattern: new RegExp(`^uploads/${id}$`),
    name: "upload-delete",
    policy: "member",
    schema: s.emptyInput,
    action: "media.delete",
    keys: ["id"],
  },
  {
    method: "GET",
    pattern: new RegExp(`^media/${id}/(main|thumb)$`),
    name: "media",
    policy: "public",
    keys: ["id", "variant"],
  },
  {
    method: "POST",
    pattern: /^reports$/,
    name: "report-create",
    policy: "public",
    schema: s.reportInput,
    action: "report.create",
    status: 201,
  },
  {
    method: "GET",
    pattern: /^members\/([a-z0-9][a-z0-9_]{2,23})$/,
    name: "member-get",
    policy: "public",
    action: "member.get",
    keys: ["handle"],
  },
  {
    method: "GET",
    pattern: /^moderation\/queue$/,
    name: "moderation-queue",
    policy: "staff",
    query: s.pageQuery,
    action: "moderation.queue",
  },
  {
    method: "GET",
    pattern: new RegExp(`^moderation/review/${id}$`),
    name: "moderation-review",
    policy: "staff",
    action: "moderation.review",
    keys: ["id"],
  },
  {
    method: "GET",
    pattern: new RegExp(`^moderation/members/${id}$`),
    name: "moderation-member",
    policy: "staff",
    action: "member.moderation",
    keys: ["id"],
  },
  {
    method: "POST",
    pattern: /^moderation\/decisions$/,
    name: "moderation-decision",
    policy: "staff",
    schema: s.decisionInput,
    action: "moderation.decide",
  },
  {
    method: "POST",
    pattern: new RegExp(`^moderation/members/${id}/status$`),
    name: "member-status",
    policy: "staff",
    schema: s.memberStatusInput,
    action: "member.status",
    keys: ["id"],
  },
  {
    method: "GET",
    pattern: /^admin\/audit$/,
    name: "audit",
    policy: "admin",
    query: s.pageQuery,
    action: "audit.list",
  },
  {
    method: "GET",
    pattern: /^admin\/features$/,
    name: "feature-list",
    policy: "admin",
    action: "feature.list",
  },
  {
    method: "POST",
    pattern: /^admin\/features$/,
    name: "features",
    policy: "admin",
    schema: s.featureInput,
    action: "feature.update",
  },
  {
    method: "POST",
    pattern: /^account\/export$/,
    name: "account-export",
    policy: "reauth",
    schema: s.emptyInput,
    action: "account.export",
    status: 202,
  },
  {
    method: "POST",
    pattern: /^account\/delete$/,
    name: "account-delete",
    policy: "reauth",
    schema: s.accountDeleteInput,
    action: "account.delete",
    status: 202,
  },
  {
    method: "GET",
    pattern: /^account\/jobs$/,
    name: "account-jobs",
    policy: "session",
    query: s.pageQuery,
    action: "account.jobs",
  },
  {
    method: "GET",
    pattern: new RegExp(`^account/jobs/${id}$`),
    name: "account-job",
    policy: "session",
    action: "account.job",
    keys: ["id"],
  },
];

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function requestHash(payload: Record<string, unknown>) {
  const hashed = { ...payload };
  delete hashed.idempotencyKey;
  return createHash("sha256").update(stable(hashed)).digest("hex");
}
function guard(auth: AuthContext, policy: Policy, write: boolean) {
  if (policy === "public") return;
  if (!auth.actor.userId || !auth.state) throw unauthorized();
  if (
    policy === "member" &&
    (!auth.state.onboarded || auth.state.member?.state !== "active")
  )
    throw forbidden("An active community account is required.");
  if (policy === "staff" || policy === "admin") {
    requireMfa(auth.state, auth.actor.aal, write);
    if (policy === "admin" && auth.state.staffRole !== "admin")
      throw forbidden();
  }
  if (policy === "reauth") {
    requireRecentReauthentication(auth.state);
    if (auth.state.staffRole) requireMfa(auth.state, auth.actor.aal, true);
  }
}
function sessionDto(auth: AuthContext) {
  const c = appConfig();
  let mfaRequired = false;
  if (auth.state?.staffRole) {
    try {
      requireMfa(auth.state, auth.actor.aal, true);
    } catch {
      mfaRequired = true;
    }
  }
  const features = auth.state?.features;
  return {
    user: auth.actor.userId ? { id: auth.actor.userId } : null,
    member: auth.state?.member || null,
    onboarded: auth.state?.onboarded || false,
    role: auth.state?.staffRole || null,
    mfaRequired,
    approvedFactorIds: auth.state?.approvedFactorIds || [],
    postingEnabled: c.postingEnabled && features?.posting_enabled !== false,
    uploadsEnabled: c.uploadsEnabled && features?.uploads_enabled !== false,
    registrationEnabled:
      c.registrationsEnabled && features?.registrations_enabled !== false,
    turnstileSiteKey: c.turnstileSiteKey,
    rulesVersion: c.rulesVersion,
    termsVersion: c.termsVersion,
  };
}
function json(data: unknown, requestId: string, status = 200) {
  if (data && typeof data === "object" && "data" in data && "page" in data)
    return Response.json({ ...data, requestId }, { status });
  return Response.json({ data, requestId }, { status });
}
function publicError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error && typeof error === "object") {
    const e = error as {
      code?: string;
      message?: string;
      status?: number;
      retryAfter?: number;
    };
    const known: Record<string, [number, string]> = {
      UNAUTHENTICATED: [401, "Sign in again to continue."],
      ASSET_BINDING: [400, "An image cannot be attached to this post."],
      SELF_REVIEW: [403, "Another staff member must review this submission."],
      LAST_ADMIN: [
        409,
        "Designate another recovery administrator before continuing.",
      ],
      AUTH_REQUIRED: [401, "Sign in again to continue."],
      FORBIDDEN: [403, "You do not have permission for this action."],
      MFA_REQUIRED: [403, "Verify your approved authenticator to continue."],
      REAUTH_REQUIRED: [403, "Confirm a fresh email code before continuing."],
      NOT_FOUND: [404, "This item is not available."],
      CONFLICT: [409, "This item changed. Reload before trying again."],
      RATE_LIMITED: [429, "Too many attempts. Please try again later."],
      VALIDATION_ERROR: [400, "Check the supplied fields."],
      SERVICE_UNAVAILABLE: [503, "This service is temporarily unavailable."],
      READ_ONLY: [503, "The board is temporarily read-only."],
      REGISTRATION_CLOSED: [503, "Registration is currently closed."],
    };
    const code =
      e.code && known[e.code]
        ? e.code
        : e.message && known[e.message]
          ? e.message
          : undefined;
    if (code) {
      const [status, message] = known[code];
      return new ApiError(
        status,
        code,
        message,
        undefined,
        status === 429 ? e.retryAfter || 60 : undefined,
      );
    }
    if (e.code === "23505" || e.code === "40001" || e.code === "40P01")
      return new ApiError(
        409,
        "CONFLICT",
        "This item changed or is already in use. Reload and try again.",
      );
    if (e.code === "23514" || e.code === "23503" || e.code === "22P02")
      return new ApiError(
        400,
        "VALIDATION_ERROR",
        "Check the supplied fields.",
      );
    if (e.code === "42501") return forbidden();
  }
  return unavailable();
}

export async function handleApi(
  request: Request,
  path: string[],
): Promise<Response> {
  if (!communityEnabled()) return communityDisabledResponse();
  const requestId = randomUUID();
  const start = performance.now();
  let jar: CookieJar | undefined;
  let auth: AuthContext | undefined;
  let routeName = "unmatched";
  let result: Response;
  let code: string | undefined;
  try {
    const pathname = path.join("/");
    if (request.url.length > 4096 || pathname.length > 400)
      throw new ApiError(413, "REQUEST_TOO_LARGE", "The request is too large.");
    if (pathname === "health/live" && request.method === "GET") {
      result = json({ live: true }, requestId);
    } else if (["internal/maintenance", "health/ready"].includes(pathname)) {
      routeName = pathname;
      authorizeInternal(request);
      if (pathname === "internal/maintenance") {
        if (request.method !== "POST")
          throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use POST.");
        await readJson(request, s.emptyInput);
        result = json(await runMaintenance(requestId), requestId);
      } else {
        if (request.method !== "GET")
          throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use GET.");
        result = json(await readiness(requestId), requestId);
      }
    } else {
      const route = routes.find(
        (item) => item.method === request.method && item.pattern.test(pathname),
      );
      if (!route)
        throw new ApiError(
          routes.some((item) => item.pattern.test(pathname)) ? 405 : 404,
          "NOT_FOUND",
          "This endpoint is not available.",
        );
      routeName = route.name;
      const config = appConfig();
      jar = new CookieJar(request, config.secureCookies);
      const write = !["GET", "HEAD"].includes(request.method);
      if (write) assertBrowserMutation(request, [config.origin]);
      auth = await loadAuth(jar, requestId);
      guard(auth, route.policy, write);
      const binding = auth.actor.sessionId
        ? `${auth.actor.sessionId}:${auth.actor.aal}`
        : jar.get("context") || "";
      if (write)
        makeCsrfProtection(secret("CSRF_SECRET"), config.secureCookies).verify(
          request,
          binding,
        );
      if (route.posting && !config.postingEnabled)
        throw new ApiError(
          503,
          "READ_ONLY",
          "The board is temporarily read-only.",
        );
      if (route.name === "upload" && !config.uploadsEnabled)
        throw new ApiError(
          503,
          "UPLOADS_DISABLED",
          "Image uploads are temporarily unavailable.",
        );
      const match = pathname.match(route.pattern)!;
      let payload: Record<string, unknown> = {};
      if (route.schema)
        payload = (await readJson(request, route.schema)) as Record<
          string,
          unknown
        >;
      const query = new URL(request.url).searchParams;
      if (
        [...query.keys()].length > 8 ||
        [...query.keys()].some((key) => query.getAll(key).length > 1)
      )
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Invalid query parameters.",
        );
      if (route.query)
        payload = {
          ...payload,
          ...(parseInput(route.query, Object.fromEntries(query)) as Record<
            string,
            unknown
          >),
        };
      else if (query.size)
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "This endpoint does not accept query parameters.",
        );
      route.keys?.forEach((key, index) => {
        payload[key] =
          key === "id" || key === "postId"
            ? parseInput(s.uuid, match[index + 1])
            : match[index + 1];
      });
      if (
        ["post.create", "post.edit"].includes(route.action || "") &&
        !config.uploadsEnabled &&
        Array.isArray(payload.assets) &&
        payload.assets.length > 0
      )
        throw new ApiError(
          503,
          "UPLOADS_DISABLED",
          "Image uploads are temporarily unavailable.",
        );
      if (route.name === "csrf") {
        const context = binding || randomUUID();
        if (!binding) jar.set("context", context, 3600);
        result = json(
          {
            token: makeCsrfProtection(
              secret("CSRF_SECRET"),
              config.secureCookies,
            ).issue(request, jar, context),
          },
          requestId,
        );
      } else if (route.name === "session")
        result = json(sessionDto(auth), requestId);
      else if (route.name === "request-code") {
        const emailKey = pseudonym("email", payload.email as string);
        await dbAction(auth.actor, "limit.cooldown", {
          subjectKey: emailKey,
          action: "auth-resend",
          seconds: 60,
        });
        await limit(auth.actor, emailKey, "auth-email", 3, 3600);
        await ipLimit(request, auth.actor, "auth-ip", 10, 3600);
        result = json(
          await requestCode(
            payload.email as string,
            payload.captchaToken as string,
            config.registrationsEnabled,
          ),
          requestId,
        );
      } else if (
        route.name === "verify-code" ||
        route.name === "reauthenticate"
      ) {
        await limit(
          auth.actor,
          pseudonym("email", payload.email as string),
          "verify-email",
          5,
          600,
        );
        await ipLimit(request, auth.actor, "verify-ip", 30, 3600);
        const verified = await verifyCode(
          payload.email as string,
          payload.code as string,
          requestId,
        );
        if (route.name === "reauthenticate") {
          const current = await freshUser(auth);
          if (
            verified.actor.userId !== auth.actor.userId ||
            current.email !== verified.user.email
          ) {
            await verified.client.auth.admin.signOut(
              verified.session.access_token,
              "local",
            );
            throw forbidden("Confirm the email belonging to this account.");
          }
          await dbAction(auth.actor, "session.reauthenticate", {});
          await verified.client.auth.admin.signOut(
            verified.session.access_token,
            "local",
          );
          result = json({ reauthenticated: true }, requestId);
        } else {
          await registerSession(verified.actor);
          jar.auth(verified.session);
          const state = await dbAction<SessionState>(
            verified.actor,
            "session.get",
            {},
          );
          result = json(
            {
              onboarded: state.onboarded,
              returnTo: state.onboarded
                ? safeReturnTo(payload.returnTo, config.origin)
                : "/onboarding",
            },
            requestId,
          );
        }
      } else if (route.name === "sign-out" || route.name === "sign-out-all") {
        if (route.name === "sign-out-all") await freshUser(auth);
        await dbAction(auth.actor, "session.revoke", {
          all: route.name === "sign-out-all",
        });
        await signOutProvider(auth, route.name === "sign-out-all");
        jar.clearAuth();
        result = json({ signedOut: true }, requestId);
      } else if (route.name === "mfa-enroll") {
        await freshUser(auth);
        await dbAction(auth.actor, "factor.enroll-allowed", {});
        const client = await providerSession(auth);
        const enrollment = await client.auth.mfa.enroll({
          factorType: "totp",
          issuer: "BONG",
        });
        if (enrollment.error || !enrollment.data) throw unavailable();
        await dbAction(auth.actor, "factor.pending", {
          factorId: enrollment.data.id,
        });
        result = json(
          { factorId: enrollment.data.id, totp: enrollment.data.totp },
          requestId,
        );
      } else if (route.name === "mfa-verify") {
        await freshUser(auth);
        await dbAction(auth.actor, "factor.verify-allowed", {
          factorId: payload.factorId,
        });
        await limit(
          auth.actor,
          pseudonym("user", auth.actor.userId!),
          "mfa-verify",
          5,
          600,
        );
        const client = await providerSession(auth);
        const verified = await client.auth.mfa.challengeAndVerify({
          factorId: payload.factorId as string,
          code: payload.code as string,
        });
        if (verified.error || !verified.data)
          throw new ApiError(
            400,
            "INVALID_CODE",
            "The authenticator code is invalid or expired.",
          );
        const stepped = await verifyToken(
          client,
          verified.data.access_token,
          requestId,
        );
        if (
          stepped.userId !== auth.actor.userId ||
          stepped.sessionId !== auth.actor.sessionId ||
          stepped.aal !== "aal2"
        )
          throw unauthorized();
        if (!auth.state!.approvedFactorIds.includes(payload.factorId as string))
          await dbAction(stepped, "factor.approve", {
            factorId: payload.factorId,
            existingFactorId: auth.state!.mfaFactorId || undefined,
          });
        await dbAction(stepped, "session.stepup", {
          factorId: payload.factorId,
        });
        jar.auth(verified.data);
        result = json({ verified: true }, requestId);
      } else if (route.name === "upload") {
        await dbAction(auth.actor, "media.upload-allowed", {});
        result = json(await uploadImage(request, auth.actor), requestId, 201);
      } else if (route.name === "media") {
        await ipLimit(request, auth.actor, "media-read", 120, 60);
        const actor = auth.actor;
        const url = await issueAuthorizedUrl(
          async () => {
            const asset = await dbAction<{ key: string }>(
              actor,
              "media.authorize",
              payload,
            );
            return asset.key;
          },
          (key) => signedPrivate("media", key),
        );
        result = new Response(null, {
          status: 307,
          headers: { location: url },
        });
      } else {
        if (route.policy === "public" && request.method === "GET")
          await ipLimit(
            request,
            auth.actor,
            payload.query ? "board-search" : "board-read",
            payload.query ? 30 : 120,
            60,
          );
        if (route.name === "onboarding") {
          if (
            !config.registrationsEnabled ||
            !config.rulesVersion ||
            !config.termsVersion
          )
            throw new ApiError(
              503,
              "REGISTRATION_CLOSED",
              "Registration is currently closed.",
            );
          if (
            payload.rulesVersion !== config.rulesVersion ||
            payload.termsVersion !== config.termsVersion
          )
            throw new ApiError(
              409,
              "POLICY_CHANGED",
              "The community policies changed. Reload and review them.",
            );
          await freshUser(auth);
        }
        if (route.name === "report-create") {
          if (!auth.actor.userId) {
            const key = pseudonym("ip", trustedIp(request));
            await limit(auth.actor, key, "visitor-reports", 3, 3600);
            await verifyChallenge(
              payload.captchaToken as string | undefined,
              "report",
            );
            payload.subjectKey = key;
          }
          delete payload.captchaToken;
          if (
            ["post", "comment", "member"].includes(payload.targetType as string)
          )
            parseInput(s.uuid, payload.targetId);
          if (payload.targetType === "idea")
            parseInput(z.string().regex(/^BONG-\d{4}$/), payload.targetId);
          if (payload.targetType === "timeline") {
            parseInput(
              z
                .string()
                .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
                .max(100),
              payload.targetId,
            );
            const { loadPublishedTimeline } =
              await import("../../features/timeline/content");
            if (
              !loadPublishedTimeline().some(
                (entry) => entry.slug === payload.targetId,
              )
            )
              throw new ApiError(
                404,
                "NOT_FOUND",
                "This article is not available.",
              );
          }
        }
        if (route.name === "features")
          await limit(
            auth.actor,
            pseudonym("user", auth.actor.userId!),
            "staff-write",
            60,
            60,
          );
        if (route.policy === "reauth") await freshUser(auth);
        if (route.name === "account-delete") payload.confirmed = true;
        if (payload.idempotencyKey) payload.requestHash = requestHash(payload);
        if (
          [
            "post.create",
            "post.edit",
            "comment.create",
            "comment.edit",
          ].includes(route.action || "")
        )
          payload.reviewAll = config.reviewAll;
        const data = await dbAction<Record<string, unknown>>(
          auth.actor,
          route.action!,
          payload,
        );
        if (route.name === "account-job") {
          const { exportKey, ...safe } = data;
          if (data.status === "complete" && typeof exportKey === "string") {
            requireRecentReauthentication(auth.state!);
            await freshUser(auth);
            if (auth.state?.staffRole)
              requireMfa(auth.state, auth.actor.aal, true);
            const actor = auth.actor;
            const downloadUrl = await issueAuthorizedUrl(
              async () => {
                const current = await dbAction<SessionState>(
                  actor,
                  "session.get",
                  {},
                );
                requireRecentReauthentication(current);
                if (
                  current.userId !== actor.userId ||
                  current.sessionId !== actor.sessionId
                )
                  throw unauthorized();
                if (current.staffRole) requireMfa(current, actor.aal, true);
                const job = await dbAction<{
                  status: string;
                  exportKey: string | null;
                }>(actor, "account.job", payload);
                if (job.status !== "complete" || !job.exportKey)
                  throw new ApiError(
                    404,
                    "NOT_FOUND",
                    "This export is not available.",
                  );
                return job.exportKey;
              },
              (key) => signedPrivate("exports", key),
            );
            result = json({ ...safe, downloadUrl, expiresIn: 60 }, requestId);
          } else result = json(safe, requestId);
        } else result = json(data, requestId, route.status || 200);
      }
    }
  } catch (error) {
    const safe = publicError(error);
    code = safe.code;
    if (safe.status === 401) jar?.clearAuth();
    result = Response.json(
      {
        error: {
          code: safe.code,
          message: safe.message,
          ...(safe.fields ? { fields: safe.fields } : {}),
        },
        requestId,
      },
      {
        status: safe.status,
        headers: safe.retryAfter
          ? { "retry-after": String(safe.retryAfter) }
          : undefined,
      },
    );
  }
  result.headers.set("cache-control", "private, no-store, max-age=0");
  result.headers.set("pragma", "no-cache");
  result.headers.set("x-content-type-options", "nosniff");
  result.headers.set("x-request-id", requestId);
  result.headers.set("vary", "Cookie");
  jar?.apply(result.headers);
  recordRequest({
    requestId,
    route: routeName,
    status: result.status,
    durationMs: Math.round(performance.now() - start),
    code,
    userId: auth?.actor.userId,
  });
  return result;
}
