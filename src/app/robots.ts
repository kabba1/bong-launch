import type { MetadataRoute } from "next";
import { origin, isProduction } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return isProduction()
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/account",
            "/onboarding",
            "/moderation",
            "/admin",
            "/api",
            "/sign-in",
            "/board",
            "/members",
          ],
        },
        sitemap: `${origin()}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
