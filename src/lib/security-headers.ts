/** Shared baseline for configured routes and early private proxy responses. */
export function staticSecurityHeaders(
  production: boolean,
): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
    ...(production
      ? { "Strict-Transport-Security": "max-age=31536000" }
      : { "X-Robots-Tag": "noindex, nofollow" }),
  };
}
