"use client";
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fields?: Record<string, string>,
    public requestId?: string,
  ) {
    super(message);
  }
}
export type ApiEnvelope<T> = {
  data: T;
  requestId: string;
  page?: { nextCursor: string | null; hasMore: boolean };
};
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiEnvelope<T>> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { "X-Bong-Request": "1" };
  const multipart = options.body instanceof FormData;
  if (method !== "GET") {
    const r = await fetch("/api/security/csrf", {
      cache: "no-store",
      credentials: "same-origin",
      signal: options.signal,
    });
    const csrf = await r.json();
    if (!r.ok)
      throw new ApiError(
        csrf.error?.code ?? "UNAVAILABLE",
        csrf.error?.message ?? "This service is temporarily unavailable.",
        r.status,
        csrf.error?.fields,
        csrf.requestId,
      );
    headers["X-CSRF-Token"] = csrf.data.token;
    if (!multipart) headers["Content-Type"] = "application/json";
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      cache: "no-store",
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new ApiError(
      "NETWORK_ERROR",
      "The connection was interrupted. Your changes have not been confirmed. Try again.",
      0,
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      result?.error?.code ?? "UNAVAILABLE",
      result?.error?.message ??
        "This service is temporarily unavailable. Try again shortly.",
      response.status,
      result?.error?.fields,
      result?.requestId,
    );
  return result;
}
export type Session = {
  user: { id: string } | null;
  member: {
    userId?: string;
    user_id?: string;
    handle: string;
    displayName?: string;
    display_name?: string;
    bio?: string;
    version?: number;
    state?: string;
  } | null;
  onboarded: boolean;
  role: "moderator" | "admin" | null;
  mfaRequired?: boolean;
  approvedFactorIds?: string[];
  postingEnabled: boolean;
  uploadsEnabled: boolean;
  registrationEnabled: boolean;
  turnstileSiteKey?: string;
  rulesVersion?: string;
  termsVersion?: string;
};
