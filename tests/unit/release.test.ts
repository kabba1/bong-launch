import { describe, it, expect } from "vitest";
import {
  evaluateRelease,
  acceptanceBlockers,
  publicAcceptanceBlockers,
  releaseScope,
  productionOriginBlockers,
  evidenceScopeBlockers,
} from "../../scripts/release-policy";
import { readFileSync } from "node:fs";
describe("OPS-13 release gates", () => {
  it("cannot clear incomplete or duplicated acceptance scenarios", () => {
    const rows = JSON.parse(
      readFileSync("docs/acceptance-evidence.json", "utf8"),
    ).scenarios.map((row: { id: string }) => ({ ...row, status: "NOT RUN" }));
    expect(acceptanceBlockers(rows).length).toBeGreaterThan(0);
    expect(acceptanceBlockers([...rows.slice(1), rows[1]])).toEqual([
      "Acceptance evidence must contain each of the 148 required IDs exactly once.",
    ]);
    expect(
      acceptanceBlockers(
        rows.map((row: { id: string }) => ({ ...row, status: "PASS" })),
      ),
    ).toEqual([]);
  });
  it("never declares the supplied unapproved package ready", () => {
    const result = evaluateRelease({
      timelineCount: 0,
      activeIdeas: 1000,
      contacts: {},
      legal: [],
      approvals: {},
      environment: "local",
      configured: [],
      checks: {},
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("eight"))).toBe(true);
    expect(result.blockers.some((b) => b.includes("security"))).toBe(true);
    expect(result.blockers.some((b) => b.includes("production"))).toBe(true);
  });
  it("a failing check remains a blocker even with all approvals", () => {
    const result = evaluateRelease({
      timelineCount: 8,
      activeIdeas: 1000,
      contacts: {
        support: "owner@bong.invalid",
        security: "security@bong.invalid",
      },
      legal: ["terms", "privacy", "community-rules", "accessibility"],
      approvals: {},
      environment: "production",
      configured: [],
      checks: { "test:security": "FAIL" },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Required check test:security is FAIL.");
  });
});

describe("public v1 release boundary", () => {
  const publicFixture = () => ({
    timelineCount: 8,
    activeIdeas: 1000,
    contacts: {
      support: "support@owned-domain.org",
      security: "security@owned-domain.org",
    },
    legal: ["terms", "privacy", "accessibility"],
    approvals: Object.fromEntries(
      [
        "visual",
        "artworkRights",
        "ideaEditorial",
        "legal",
        "independentSecurityReview",
        "manualAccessibility",
        "loadAndPerformance",
        "productionAuthorization",
        "publicHosting",
        "publicDeploymentReview",
      ].map((key) => [
        key,
        {
          approvedBy: "Isolated policy test",
          approvedAt: "2026-09-27",
          evidence: "Synthetic policy fixture, never production approval",
        },
      ]),
    ),
    environment: "production",
    configured: ["APP_ORIGIN"],
    communityEnabled: false,
    checks: Object.fromEntries(
      [
        "lint",
        "typecheck",
        "content:validate",
        "test:unit",
        "test:integration",
        "test:security",
        "test:e2e",
        "test:a11y",
        "build",
        "dependencyAudit",
        "secretScan",
      ].map((key) => [key, "PASS"]),
    ),
  });
  it("requires no database, mail, CAPTCHA or staff approvals for public v1", () => {
    expect(evaluateRelease(publicFixture()).blockers).toEqual([]);
  });
  it("blocks public v1 when community is enabled even if credentials are configured", () => {
    const input = publicFixture();
    input.communityEnabled = true;
    input.configured.push(
      "BONG_DATABASE_URL",
      "SUPABASE_URL",
      "TURNSTILE_SECRET_KEY",
    );
    expect(evaluateRelease(input).blockers).toContain(
      "Public v1 requires COMMUNITY_ENABLED to remain disabled.",
    );
  });
  it("retains real history, contact and public owner approval gates", () => {
    const input = publicFixture();
    input.timelineCount = 0;
    delete input.approvals.independentSecurityReview;
    input.contacts.security = "";
    const result = evaluateRelease(input);
    expect(result.blockers.some((value) => value.includes("eight"))).toBe(true);
    expect(
      result.blockers.some((value) =>
        value.includes("independent security review"),
      ),
    ).toBe(true);
    expect(
      result.blockers.some((value) => value.includes("security contact")),
    ).toBe(true);
  });
  it("preserves full future community provider and staffing requirements", () => {
    const result = evaluateRelease(publicFixture(), "community");
    expect(
      result.blockers.some((value) => value.includes("BONG_DATABASE_URL")),
    ).toBe(true);
    expect(
      result.blockers.some((value) => value.includes("moderationStaffing")),
    ).toBe(true);
    expect(
      result.blockers.some((value) => value.includes("community-rules")),
    ).toBe(true);
    expect(result.ready).toBe(false);
  });
  it("uses public scope by default and rejects ambiguous scope arguments", () => {
    expect(releaseScope([])).toBe("v1");
    expect(releaseScope(["--scope=community"])).toBe("community");
    expect(() => releaseScope(["--scope=anything"])).toThrow();
    expect(() => releaseScope(["--scope=community", "--scope=v1"])).toThrow();
  });
  it("keeps strict production HTTPS origin validation independent of scope", () => {
    expect(productionOriginBlockers("https://bong.owned-domain.org")).toEqual(
      [],
    );
    for (const origin of [
      undefined,
      "http://bong.owned-domain.org",
      "https://localhost",
      "https://127.0.0.1",
      "https://[::1]",
      "https://user:password@bong.owned-domain.org",
      "https://bong.owned-domain.org/path",
      "https://bong.owned-domain.org/?next=x",
      "https://bong.owned-domain.org/#fragment",
      "https://",
    ]) {
      expect(productionOriginBlockers(origin).length).toBeGreaterThan(0);
    }
  });
  it("never reuses public-only automated evidence to authorize community release", () => {
    expect(evidenceScopeBlockers("v1", "v1")).toEqual([]);
    expect(evidenceScopeBlockers("community", "community")).toEqual([]);
    expect(evidenceScopeBlockers("v1", "community").length).toBeGreaterThan(0);
    expect(evidenceScopeBlockers(undefined, "v1").length).toBeGreaterThan(0);
  });
  it("cannot treat deferred community rows or duplicated public rows as v1 evidence", () => {
    expect(
      publicAcceptanceBlockers([{ id: "AUTH-01", status: "PASS" }]).length,
    ).toBeGreaterThan(0);
    const document = JSON.parse(
      readFileSync("docs/v1-acceptance-evidence.json", "utf8"),
    );
    const passed = document.scenarios.map((row: { id: string }) => ({
      id: row.id,
      status: "PASS",
    }));
    expect(publicAcceptanceBlockers(passed)).toEqual([]);
    expect(
      publicAcceptanceBlockers([...passed.slice(1), passed[1]]).length,
    ).toBeGreaterThan(0);
    expect(
      publicAcceptanceBlockers(
        passed.map((row: { id: string }, index: number) => ({
          ...row,
          status: index === 0 ? "PARTIAL" : "PASS",
        })),
      ).length,
    ).toBeGreaterThan(0);
  });
});
