import { describe, it, expect } from "vitest";
import {
  actorFromVerifiedClaims,
  requireMfa,
  requireRecentReauthentication,
} from "../../src/server/auth/session";
const id = "c5d65141-15d1-4f4c-9912-07b26e1ea6cc";
describe("AUTH-05/09/16 verified session and approved-factor requirements", () => {
  it("rejects expired, absent-session, incorrect issuer, anonymous and malformed claims", () => {
    const claims = {
      sub: id,
      session_id: id,
      aal: "aal1",
      exp: 200,
      iss: "https://project.supabase.co/auth/v1",
      aud: "authenticated",
    };
    expect(
      actorFromVerifiedClaims(
        claims,
        "request",
        "https://project.supabase.co",
        100,
      ).userId,
    ).toBe(id);
    for (const bad of [
      { exp: 99 },
      { session_id: undefined },
      { iss: "https://evil.test/auth/v1" },
      { is_anonymous: true },
      { sub: "not-uuid" },
      { aud: "anon" },
    ])
      expect(() =>
        actorFromVerifiedClaims(
          { ...claims, ...bad },
          "request",
          "https://project.supabase.co",
          100,
        ),
      ).toThrow();
  });
  it("denies generic aal2 without a registered approved-factor stepup", () => {
    const state = {
      staffRole: "moderator" as const,
      approvedFactorIds: [id],
      mfaFactorId: id,
      stepUpAt: new Date(1_000_000).toISOString(),
    };
    expect(() => requireMfa(state, "aal2", true, 1_010_000)).not.toThrow();
    for (const bad of [
      { mfaFactorId: "unapproved" },
      { approvedFactorIds: [] },
      { stepUpAt: null },
      { staffRole: null },
    ])
      expect(() =>
        requireMfa({ ...state, ...bad }, "aal2", true, 1_010_000),
      ).toThrow();
    expect(() => requireMfa(state, "aal1", true, 1_010_000)).toThrow();
    expect(() => requireMfa(state, "aal2", true, 2_000_001)).toThrow();
  });
  it("requires recent provider-confirmed reauthentication before data actions", () => {
    expect(() =>
      requireRecentReauthentication(
        { reauthenticatedAt: new Date(1_000_000).toISOString() },
        1_010_000,
      ),
    ).not.toThrow();
    expect(() =>
      requireRecentReauthentication(
        { reauthenticatedAt: new Date(1_000_000).toISOString() },
        1_600_001,
      ),
    ).toThrow();
    expect(() =>
      requireRecentReauthentication({ reauthenticatedAt: null }, 1_010_000),
    ).toThrow();
  });
});
