import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch as unstable_doesProxyMatch } from "next/experimental/testing/server";
import nextConfig from "../../next.config";
import { config, proxy } from "../../src/proxy";

afterEach(() => vi.unstubAllEnvs());

describe("static public headers and private proxy boundary (SEC-07/08/16)", () => {
  it("skips all public HTML, metadata and assets while matching private pages and APIs", () => {
    for (const url of [
      "/",
      "/about",
      "/community",
      "/through-time",
      "/through-time/story",
      "/idea/BONG-0001",
      "/idea/BONG-0001/opengraph-image",
      "/privacy",
      "/terms",
      "/accessibility",
      "/contact",
      "/community-rules",
      "/robots.txt",
      "/sitemap.xml",
      "/.well-known/security.txt",
      "/_next/static/chunk.js",
      "/images/bong.webp",
      "/data/manifest.json",
    ])
      expect(unstable_doesProxyMatch({ config, nextConfig, url }), url).toBe(
        false,
      );
    for (const url of [
      "/board",
      "/board/new",
      "/sign-in",
      "/onboarding",
      "/account/data",
      "/moderation/review/item",
      "/admin/audit",
      "/members/person",
      "/api/session",
    ])
      expect(unstable_doesProxyMatch({ config, nextConfig, url }), url).toBe(
        true,
      );
  });

  it("does not make public responses private even if invoked directly", () => {
    vi.stubEnv("COMMUNITY_ENABLED", "false");
    const response = proxy(new NextRequest("https://bong.test/about"));
    expect(response.headers.get("cache-control")).toBeNull();
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeNull();
  });

  it("retains fresh nonces and no-store for enabled private HTML", () => {
    vi.stubEnv("COMMUNITY_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    const first = proxy(new NextRequest("https://bong.test/account"));
    const second = proxy(new NextRequest("https://bong.test/account"));
    const csp = first.headers.get("content-security-policy");
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(
      csp
        ?.split(";")
        .find((directive) => directive.trim().startsWith("script-src ")),
    ).not.toContain("unsafe-inline");
    expect(csp).not.toBe(second.headers.get("content-security-policy"));
    expect(first.headers.get("cache-control")).toContain("no-store");
  });

  it.each(["staging", "production"])(
    "sets baseline headers on early private edge responses in %s",
    async (environment) => {
      vi.stubEnv("APP_ENV", environment);
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("COMMUNITY_ENABLED", "false");
      const rules = await nextConfig.headers!();
      const baseline = rules.find((rule) => rule.source === "/:path*")!.headers;
      for (const path of ["/account", "/api/session"]) {
        const response = proxy(new NextRequest(`https://bong.test${path}`));
        for (const { key, value } of baseline) {
          if (key === "Content-Security-Policy") continue;
          expect(response.headers.get(key), `${path} ${key}`).toBe(value);
        }
        expect(response.headers.get("cache-control")).toContain("no-store");
        expect(response.headers.get("content-security-policy")).toContain(
          "'nonce-",
        );
        expect(response.headers.get("x-robots-tag")).toBe(
          environment === "production" ? null : "noindex, nofollow",
        );
        expect(response.headers.has("strict-transport-security")).toBe(
          environment === "production",
        );
      }
    },
  );

  it.each(["staging", "preview", "production"])(
    "sets static security headers for %s without overriding public HTML caching",
    async (environment) => {
      vi.stubEnv("APP_ENV", environment);
      vi.stubEnv("NODE_ENV", "production");
      const rules = await nextConfig.headers!();
      const rule = rules.find((entry) => entry.source === "/:path*");
      expect(rule).toBeDefined();
      const headers = Object.fromEntries(
        rule!.headers.map(({ key, value }) => [key.toLowerCase(), value]),
      );
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(headers["permissions-policy"]).toBe(
        "camera=(), microphone=(), geolocation=(), payment=()",
      );
      expect(headers["cache-control"]).toBeUndefined();
      const csp = headers["content-security-policy"];
      for (const directive of [
        "default-src 'self'",
        "frame-ancestors 'none'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "script-src-attr 'none'",
        "style-src 'self'",
        "connect-src 'self'",
      ])
        expect(csp).toContain(directive);
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).not.toMatch(/nonce-|unsafe-eval|https?:|\*/);
      if (environment === "production") {
        expect(headers["strict-transport-security"]).toBe("max-age=31536000");
        expect(headers["x-robots-tag"]).toBeUndefined();
        expect(csp).toContain("upgrade-insecure-requests");
      } else {
        expect(headers["strict-transport-security"]).toBeUndefined();
        expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
        expect(csp).not.toContain("upgrade-insecure-requests");
      }
    },
  );
});
