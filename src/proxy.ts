import { NextRequest, NextResponse } from "next/server";
import {
  communityEnabled,
  communityPagePath,
  communityApiPath,
  communityDisabledResponse,
} from "./lib/launch-scope";
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!communityPagePath(pathname) && !communityApiPath(pathname))
    return NextResponse.next();
  const community = communityEnabled();
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(18)),
  ).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  let storage = "";
  try {
    storage = community ? new URL(process.env.SUPABASE_URL || "").origin : "";
  } catch {}
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${community ? " https://challenges.cloudflare.com" : ""}${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob:${storage ? " " + storage : ""}`,
    "font-src 'self'",
    `connect-src 'self'${community ? " https://challenges.cloudflare.com" : ""}${dev ? " ws:" : ""}`,
    community
      ? "frame-src https://challenges.cloudflare.com"
      : "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.APP_ENV === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response =
    !community && communityApiPath(pathname)
      ? communityDisabledResponse()
      : !community && communityPagePath(pathname)
        ? NextResponse.redirect(new URL("/community", request.url))
        : NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
export const config = {
  matcher: [
    "/board/:path*",
    "/sign-in/:path*",
    "/onboarding/:path*",
    "/account/:path*",
    "/moderation/:path*",
    "/admin/:path*",
    "/members/:path*",
    "/api/:path*",
  ],
};
