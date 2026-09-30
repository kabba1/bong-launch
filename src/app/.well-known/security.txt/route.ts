import { publicSettings, origin } from "@/lib/site";
export const dynamic = "force-static";
export function GET() {
  if (!publicSettings.contacts.security)
    return new Response(
      "Security contact has not yet been configured. Public launch is blocked.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  const expiry = process.env.SECURITY_TXT_EXPIRES;
  if (!expiry || Number.isNaN(Date.parse(expiry)))
    return new Response("Security contact expiry requires configuration.", {
      status: 503,
    });
  return new Response(
    `Contact: mailto:${publicSettings.contacts.security}\nExpires: ${expiry}\nPreferred-Languages: en\nCanonical: ${origin()}/.well-known/security.txt\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
