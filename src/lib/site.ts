import "server-only";
import settings from "../../content/site.json";
import { siteSchema } from "./content-config";
export function origin() {
  const value = process.env.APP_ORIGIN || "http://127.0.0.1:3210";
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("APP_ORIGIN must be an origin");
  if (process.env.APP_ENV === "production" && url.protocol !== "https:")
    throw new Error("Production requires HTTPS");
  return url.origin;
}
export const isProduction = () => process.env.APP_ENV === "production";
type PublicSettings = {
  tokenStatus: "not_launched" | "live";
  token: null | {
    address: string;
    network: string;
    url: string;
    disclosure: string;
  };
  socials: { x?: string; telegram?: string };
  contacts: { support?: string; security?: string };
  policies: { rulesVersion: string | null; legalVersion: string | null };
  approvals: Record<string, unknown>;
};
export const publicSettings: PublicSettings = siteSchema.parse(settings);
export function safeHttps(value: string | undefined) {
  if (!value) return undefined;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}
