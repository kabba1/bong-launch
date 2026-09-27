import { NextRequest, NextResponse } from "next/server";
import overrides from "../content/idea-overrides.json";
import {
  communityEnabled,
  communityPagePath,
  communityApiPath,
  communityDisabledResponse,
} from "./lib/launch-scope";
export function proxy(request: NextRequest) {
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
  const ideaMatch = request.nextUrl.pathname.match(/^\/idea\/(BONG-\d{4})$/);
  const response =
    !community && communityApiPath(request.nextUrl.pathname)
      ? communityDisabledResponse()
      : !community && communityPagePath(request.nextUrl.pathname)
        ? NextResponse.redirect(new URL("/community", request.url))
        : ideaMatch && overrides.excludedIds.includes(ideaMatch[1] as never)
          ? new NextResponse(
              '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Idea withdrawn · BONG</title></head><body><main><h1>This idea has been withdrawn.</h1><p>It is no longer part of the public collection.</p><a href="/">Back to the Bong</a></main></body></html>',
              {
                status: 410,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              },
            )
          : NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  if (process.env.APP_ENV === "production")
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  if (process.env.APP_ENV !== "production")
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|images/|data/|fonts/|favicon.ico|icon.svg).*)",
  ],
};
