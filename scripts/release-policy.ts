export type ReleaseInput = {
  timelineCount: number;
  activeIdeas: number;
  contacts: Record<string, string | undefined>;
  legal: string[];
  approvals: Record<string, unknown>;
  environment: string;
  configured: string[];
  checks: Record<string, string>;
};
export function acceptanceBlockers(scenarios: unknown): string[] {
  if (!Array.isArray(scenarios))
    return ["The full 148-scenario acceptance evidence is missing."];
  const counts = {
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
  };
  const expected = Object.entries(counts).flatMap(([prefix, count]) =>
    Array.from(
      { length: count },
      (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`,
    ),
  );
  const ids = scenarios.map((row) => row?.id);
  if (
    ids.length !== 148 ||
    new Set(ids).size !== 148 ||
    expected.some((id) => !ids.includes(id))
  )
    return [
      "Acceptance evidence must contain each of the 148 required IDs exactly once.",
    ];
  const unresolved = scenarios.filter((row) => row.status !== "PASS");
  return unresolved.length
    ? [
        `${unresolved.length} required acceptance scenarios remain PARTIAL, NOT RUN or failed; see docs/acceptance-evidence.json.`,
      ]
    : [];
}
export function evaluateRelease(input: ReleaseInput): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (input.activeIdeas === 0) blockers.push("The active corpus is empty.");
  if (input.timelineCount < 8)
    blockers.push(
      "At least eight genuine reviewed timeline articles are required.",
    );
  for (const contact of ["support", "security"])
    if (!input.contacts[contact])
      blockers.push(`A real monitored ${contact} contact is required.`);
  for (const legal of ["terms", "privacy", "community-rules", "accessibility"])
    if (!input.legal.includes(legal))
      blockers.push(`Approved ${legal} content is missing.`);
  for (const gate of [
    "visual",
    "artworkRights",
    "ideaEditorial",
    "legal",
    "providersBudgetRegion",
    "moderationStaffing",
    "independentSecurityReview",
    "restoreDrill",
    "stagingIntegrations",
    "manualAccessibility",
    "loadAndPerformance",
    "productionAuthorization",
  ]) {
    const record = input.approvals[gate] as
      | { approvedBy?: string; approvedAt?: string; evidence?: string }
      | undefined;
    if (!record?.approvedBy || !record.approvedAt || !record.evidence)
      blockers.push(
        `Owner/reviewer evidence is missing: ${gate}${gate === "independentSecurityReview" ? " (independent security review)" : ""}.`,
      );
  }
  if (input.environment !== "production")
    blockers.push(
      "The production environment and canonical origin are not verified.",
    );
  for (const variable of [
    "APP_ORIGIN",
    "BONG_DATABASE_URL",
    "BONG_MAINTENANCE_DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_STORAGE_SERVICE_KEY",
    "SUPABASE_AUTH_ADMIN_KEY",
    "SUPABASE_MEDIA_BUCKET",
    "SUPABASE_EXPORT_BUCKET",
    "CSRF_SECRET",
    "RATE_LIMIT_SECRET",
    "LOG_HMAC_SECRET",
    "MAINTENANCE_TOKEN",
    "TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "COMMUNITY_RULES_VERSION",
    "TERMS_VERSION",
  ])
    if (!input.configured.includes(variable))
      blockers.push(
        `Required deployment configuration is missing: ${variable}.`,
      );
  for (const check of [
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
  ])
    if (input.checks[check] !== "PASS")
      blockers.push(
        `Required check ${check} is ${input.checks[check] ?? "NOT RUN"}.`,
      );
  return { ready: blockers.length === 0, blockers };
}
