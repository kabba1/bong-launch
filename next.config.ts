import type { NextConfig } from "next";
import overrides from "./content/idea-overrides.json";
import { staticSecurityHeaders } from "./src/lib/security-headers";
const config: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["sharp", "postgres"],
  outputFileTracingIncludes: {
    "/*": [
      "./content/generated/**/*.json",
      "./content/site.json",
      "./content/legal/**/*.json",
    ],
  },
  async rewrites() {
    return {
      beforeFiles: overrides.excludedIds.map((ideaId: string) => ({
        source: `/idea/${ideaId}`,
        destination: `/idea/${ideaId}/removed`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    const dev = process.env.NODE_ENV === "development";
    const production = process.env.APP_ENV === "production";
    // Static public v1 uses only first-party scripts and plain-text content.
    // Next's inline hydration needs unsafe-inline with the current Turbopack
    // build. Private HTML retains request nonces in the narrowly scoped proxy.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
      "script-src-attr 'none'",
      `style-src 'self'${dev ? " 'unsafe-inline'" : ""}`,
      "style-src-attr 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self'${dev ? " ws:" : ""}`,
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(production ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          ...Object.entries(staticSecurityHeaders(production)).map(
            ([key, value]) => ({ key, value }),
          ),
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/data/manifest.json",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};
export default config;
