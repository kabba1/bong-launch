import "server-only";
import { appConfig, required } from "../config/env";
import { ApiError, unavailable } from "./errors";

export async function verifyChallenge(
  token: string | undefined,
  action: "upload" | "report",
) {
  if (!token || token.length > 2048)
    throw new ApiError(
      400,
      "CHALLENGE_REQUIRED",
      "Complete the security check and try again.",
    );
  const config = appConfig();
  const key = required("TURNSTILE_SECRET_KEY");
  if (
    config.environment === "production" &&
    (key.startsWith("1x") || key.startsWith("2x") || key.startsWith("3x"))
  )
    throw unavailable();
  let response: Response;
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: key, response: token }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
  } catch {
    throw unavailable();
  }
  if (!response.ok) throw unavailable();
  const data = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  if (
    !data.success ||
    data.hostname !== new URL(config.origin).hostname ||
    data.action !== action
  )
    throw new ApiError(
      400,
      "CHALLENGE_FAILED",
      "The security check expired or failed. Please try again.",
    );
}
