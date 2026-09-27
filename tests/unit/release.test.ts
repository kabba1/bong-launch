import { describe, it, expect } from "vitest";
import {
  evaluateRelease,
  acceptanceBlockers,
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
