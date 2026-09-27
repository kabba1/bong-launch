import "server-only";
import { randomUUID } from "node:crypto";
import { CookieJar } from "../auth/cookies";
import { loadAuth } from "../auth/provider";
import { appConfig } from "../config/env";
import { dbAction, type Actor } from "../db/database";
import { ApiError } from "../security/errors";
import { ipLimit } from "../security/rate-limit";
import { communityEnabled } from "../../lib/launch-scope";

/** Read-only RSC adapter. It never refreshes a provider token or discards a Set-Cookie response. */
export async function readPageData<T>(
  request: Request,
  action: "post.get" | "member.get",
  payload: Record<string, unknown>,
): Promise<T> {
  if (!communityEnabled())
    throw new ApiError(
      404,
      "COMMUNITY_DISABLED",
      "The BONG community is coming soon.",
    );
  const requestId = randomUUID();
  let actor: Actor = { userId: null, sessionId: null, aal: "aal1", requestId };
  const jar = new CookieJar(request, appConfig().secureCookies);
  let attemptedCredentials = false;
  try {
    actor = (await loadAuth(jar, requestId, { refresh: false })).actor;
  } catch (error) {
    // Failed credentials confer no identity; ordinary public reads still work.
    if (
      !(
        (error instanceof ApiError && error.status === 401) ||
        (error instanceof Error && error.message === "AUTH_REQUIRED")
      )
    )
      throw error;
    attemptedCredentials = !!(jar.get("access") || jar.get("refresh"));
  }
  await ipLimit(request, actor, "board-read", 120, 60);
  try {
    return await dbAction<T>(actor, action, payload);
  } catch (error) {
    if (
      attemptedCredentials &&
      action === "post.get" &&
      error instanceof Error &&
      (error.message === "NOT_FOUND" ||
        (error instanceof ApiError && error.code === "NOT_FOUND"))
    ) {
      throw new ApiError(
        401,
        "SESSION_RECOVERY_REQUIRED",
        "Check your session before retrying this page.",
      );
    }
    throw error;
  }
}
