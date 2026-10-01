import type { MetadataRoute } from "next";
import { origin, isProduction } from "@/lib/site";
import { getAllIdeas, listPublishedTimeline } from "@/server/content";
import { communityEnabled } from "@/lib/launch-scope";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProduction()) return [];
  return [
    "",
    "/about",
    "/through-time",
    "/community",
    "/privacy",
    "/terms",
    ...(communityEnabled() ? ["/community-rules"] : []),
    "/accessibility",
    ...getAllIdeas().map((i) => `/idea/${i.id}`),
    ...listPublishedTimeline().map((i) => `/through-time/${i.slug}`),
  ].map((path) => ({ url: origin() + path }));
}
