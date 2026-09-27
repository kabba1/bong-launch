import type { MetadataRoute } from "next";
import { origin, isProduction } from "@/lib/site";
import { getAllIdeas, listPublishedTimeline } from "@/server/content";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProduction()) return [];
  return [
    "",
    "/about",
    "/through-time",
    "/privacy",
    "/terms",
    "/community-rules",
    "/contact",
    "/accessibility",
    ...getAllIdeas().map((i) => `/idea/${i.id}`),
    ...listPublishedTimeline().map((i) => `/through-time/${i.slug}`),
  ].map((path) => ({ url: origin() + path }));
}
