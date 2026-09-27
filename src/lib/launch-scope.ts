/** Server-controlled opt-in for the preserved future community release. */
export function communityEnabled(): boolean {
  return process.env.COMMUNITY_ENABLED === "true";
}

export function communityPagePath(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* Invalid paths stay unmatched. */
  }
  return /^\/(?:board|sign-in|onboarding|account|moderation|admin|members)(?:\/|$)/.test(
    decoded,
  );
}

export function communityApiPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* Invalid paths stay unmatched. */
  }
  return /^\/api(?:\/|$)/.test(decoded);
}

/** No cookies, provider configuration, request-body parsing or external I/O. */
export function communityDisabledResponse(): Response {
  return Response.json(
    {
      error: {
        code: "COMMUNITY_DISABLED",
        message: "The BONG community is coming soon.",
      },
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
