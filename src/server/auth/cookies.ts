import type { Session } from "@supabase/supabase-js";

export function parseCookies(request: Request): Record<string, string> {
  const output: Record<string, string> = Object.create(null);
  const raw = request.headers.get("cookie") || "";
  if (raw.length > 24_000) return output;
  const seen = new Set<string>();
  for (const part of raw.split(";")) {
    const equals = part.indexOf("=");
    if (equals < 1) continue;
    const key = part.slice(0, equals).trim();
    try {
      if (seen.has(key)) {
        delete output[key];
        continue;
      }
      seen.add(key);
      output[key] = decodeURIComponent(part.slice(equals + 1).trim());
    } catch {
      /* Malformed cookies confer no authority. */
    }
  }
  return output;
}

export class CookieJar {
  private outgoing = new Map<string, string>();
  readonly incoming: Record<string, string>;
  constructor(
    request: Request,
    readonly secure: boolean,
  ) {
    this.incoming = parseCookies(request);
  }
  name(kind: string) {
    return `${this.secure ? "__Host-" : ""}bong-${kind}`;
  }
  get(kind: string) {
    return this.incoming[this.name(kind)];
  }
  set(kind: string, value: string, maxAge: number) {
    this.setNamed(this.name(kind), value, maxAge);
  }
  setNamed(name: string, value: string, maxAge = 3600) {
    this.outgoing.set(
      name,
      `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; SameSite=Lax${this.secure ? "; Secure" : ""}`,
    );
  }
  clear(kind: string) {
    this.set(kind, "", 0);
  }
  auth(
    session: Pick<Session, "access_token" | "refresh_token" | "expires_in">,
  ) {
    this.set("access", session.access_token, 30 * 86400);
    this.set("refresh", session.refresh_token, 30 * 86400);
    this.clear("csrf");
    this.clear("context");
  }
  clearAuth() {
    for (const kind of ["access", "refresh", "csrf", "context"])
      this.clear(kind);
  }
  headers() {
    return [...this.outgoing.values()];
  }
  apply(headers: Headers) {
    for (const cookie of this.headers()) headers.append("set-cookie", cookie);
  }
}
