import { describe, expect, it } from "vitest";
import { makeCsrfProtection } from "../../src/server/security/csrf";
import { CookieJar } from "../../src/server/auth/cookies";

describe("SEC-04 session-bound signed CSRF", () => {
  const protection = makeCsrfProtection("test-only-".repeat(8), true);
  const req = (cookie = "", token = "") =>
    new Request("https://bong.example/api/posts", {
      method: "POST",
      headers: { cookie, "x-csrf-token": token },
    });
  it("binds a valid token to the authenticated session and rejects unsigned cookie equality", () => {
    const jar = new CookieJar(req(), true);
    const token = protection.issue(req(), jar, "verified-session-A");
    const cookie = jar.headers()[0].split(";")[0];
    expect(() =>
      protection.verify(req(cookie, token), "verified-session-A"),
    ).not.toThrow();
    expect(() =>
      protection.verify(req(cookie, token), "verified-session-B"),
    ).toThrow();
    expect(() =>
      protection.verify(
        req("__Host-bong-csrf=attacker", "attacker"),
        "verified-session-A",
      ),
    ).toThrow();
    expect(() =>
      protection.verify(req(cookie), "verified-session-A"),
    ).toThrow();
  });
  it("issues host-only HttpOnly Secure cookies with no domain and clears identically", () => {
    const jar = new CookieJar(req(), true);
    jar.set("access", "test-token", 60);
    jar.clear("refresh");
    for (const value of jar.headers()) {
      expect(value).toContain("; HttpOnly");
      expect(value).toContain("; Secure");
      expect(value).toContain("; SameSite=Lax");
      expect(value).not.toContain("Domain=");
    }
    expect(jar.headers()[1]).toContain("Max-Age=0");
  });
});
