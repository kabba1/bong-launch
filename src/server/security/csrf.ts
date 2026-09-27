import { doubleCsrf } from "csrf-csrf";
import { CookieJar, parseCookies } from "../auth/cookies";
import { forbidden } from "./errors";

/** Only adapts request/response transport; token construction and verification remain in csrf-csrf. */
export function makeCsrfProtection(secret: string, secure: boolean) {
  type CsrfRequest = Parameters<
    ReturnType<typeof doubleCsrf>["validateRequest"]
  >[0];
  type CsrfResponse = Parameters<
    ReturnType<typeof doubleCsrf>["generateCsrfToken"]
  >[1];
  const csrf = doubleCsrf({
    getSecret: () => secret,
    getSessionIdentifier: (req) =>
      (req as unknown as { bongSession: string }).bongSession,
    cookieName: `${secure ? "__Host-" : ""}bong-csrf`,
    cookieOptions: { httpOnly: true, secure, sameSite: "lax", path: "/" },
    getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
  });
  const adapt = (request: Request, session: string) =>
    ({
      method: request.method,
      headers: {
        "x-csrf-token": request.headers.get("x-csrf-token") || undefined,
      },
      cookies: parseCookies(request),
      bongSession: session,
    }) as unknown as CsrfRequest;
  return {
    issue(request: Request, jar: CookieJar, session: string) {
      const response = {
        cookie: (name: string, value: string) =>
          jar.setNamed(name, value, 3600),
      } as unknown as CsrfResponse;
      return csrf.generateCsrfToken(adapt(request, session), response);
    },
    verify(request: Request, session: string) {
      if (!session || !csrf.validateRequest(adapt(request, session)))
        throw forbidden("Your form session expired. Reload and try again.");
    },
  };
}
