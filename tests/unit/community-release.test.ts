import { describe, it, expect } from "vitest";
import {
  evaluateRelease,
  acceptanceBlockers,
  asvsBlockers,
  evidenceScopeBlockers,
} from "../../scripts/community/release-policy";

describe("future Community-v2 release framework, outside v1", () => {
  it("retains the full acceptance register and rejects duplicate or unfinished rows", () => {
    // Synthetic validator inputs; no archived release status is a v1 test input.
    const rows = Object.entries({
      DATA: 10,
      GEN: 16,
      TIME: 9,
      AUTH: 19,
      BOARD: 15,
      COMMENT: 8,
      MEDIA: 14,
      SEC: 17,
      MOD: 10,
      PRIV: 8,
      UX: 9,
      OPS: 13,
    }).flatMap(([prefix, count]) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
        status: "PASS",
      })),
    );
    expect(acceptanceBlockers(rows)).toEqual([]);
    expect(acceptanceBlockers(rows.slice(1)).length).toBeGreaterThan(0);
    expect(
      acceptanceBlockers([...rows.slice(1), rows[1]]).length,
    ).toBeGreaterThan(0);
    expect(
      acceptanceBlockers([{ ...rows[0], status: "NOT RUN" }, ...rows.slice(1)])
        .length,
    ).toBeGreaterThan(0);
  });
  it("retains independent ASVS review requirements for future private features", () => {
    const rows = Array.from({ length: 253 }, (_, index) => ({
      id: `synthetic-control-${index + 1}`,
      status: "NOT RUN",
    }));
    expect(asvsBlockers(rows, "community").length).toBeGreaterThan(0);
    expect(asvsBlockers(rows.slice(1), "community").length).toBeGreaterThan(0);
    const completed = rows.map((row) => ({ ...row, status: "PASS" }));
    expect(asvsBlockers(completed, "community")).toEqual([]);
    expect(
      asvsBlockers([...completed.slice(1), completed[1]], "community").length,
    ).toBeGreaterThan(0);
    expect(
      asvsBlockers(
        [{ ...completed[0], status: "EXCLUDED" }, ...completed.slice(1)],
        "community",
      ).length,
    ).toBeGreaterThan(0);
  });
  it("does not treat public-only evidence as Community verification", () => {
    expect(evidenceScopeBlockers("v1", "community").length).toBeGreaterThan(0);
    expect(
      evidenceScopeBlockers(undefined, "community").length,
    ).toBeGreaterThan(0);
  });
  it("preserves explicit enablement, provider, staffing and failed-check requirements", () => {
    const result = evaluateRelease(
      {
        timelineCount: 0,
        activeIdeas: 1000,
        contacts: {},
        legal: [],
        approvals: {},
        environment: "local",
        configured: [],
        checks: { "test:security": "FAIL" },
        communityEnabled: false,
      },
      "community",
    );
    expect(result.ready).toBe(false);
    for (const detail of [
      "explicitly enabled",
      "BONG_DATABASE_URL",
      "moderationStaffing",
      "community-rules",
      "test:security is FAIL",
    ])
      expect(result.blockers.some((message) => message.includes(detail))).toBe(
        true,
      );
  });
});
