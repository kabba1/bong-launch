export type ReleaseInput = {
  timelineCount: number;
  activeIdeas: number;
  contacts: Record<string, string | undefined>;
  legal: string[];
  approvals: Record<string, unknown>;
  environment: string;
  configured: string[];
  checks: Record<string, string>;
  communityEnabled?: boolean;
};
export type ReleaseScope = "v1" | "community";
export function evidenceScopeBlockers(
  recordedScope: unknown,
  scope: ReleaseScope,
): string[] {
  return recordedScope === scope
    ? []
    : [
        `Automated evidence must explicitly identify scope=${scope}; evidence for a different or unspecified scope cannot authorize this release.`,
      ];
}
export function productionOriginBlockers(value: string | undefined): string[] {
  try {
    if (!value || value !== value.trim()) throw new Error("Missing origin");
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "[::1]" ||
      url.hostname === "0.0.0.0" ||
      /^127\./.test(url.hostname)
    )
      throw new Error("Unsafe production origin");
    return [];
  } catch {
    return [
      "Production APP_ORIGIN must be a non-loopback HTTPS origin without credentials, path, query or fragment.",
    ];
  }
}
export function releaseScope(args: string[]): ReleaseScope {
  if (args.length === 0 || (args.length === 1 && args[0] === "--scope=v1"))
    return "v1";
  if (args.length === 1 && args[0] === "--scope=community") return "community";
  throw new Error(
    "Use release:check with no arguments, --scope=v1 or --scope=community.",
  );
}
const ids = (prefix: string, values: number[]) =>
  values.map((value) => `${prefix}-${String(value).padStart(2, "0")}`);
const range = (count: number) =>
  Array.from({ length: count }, (_, index) => index + 1);
export const V1_ACCEPTANCE_IDS = [
  ...ids("DATA", range(10)),
  ...ids("GEN", range(15)),
  ...ids("TIME", range(9)),
  ...ids("SEC", [1, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17]),
  "PRIV-08",
  ...ids("UX", range(9)),
  ...ids("OPS", [1, 3, 5, 6, 7, 10, 11, 12, 13]),
  ...ids("V1", range(6)),
];
// Public web, content/build, hosting and dormant-route perimeter controls.
// Account/session/SQL/private-upload requirements stay in the community register.
export const V1_ASVS_IDS = [
  "1.1.1",
  "1.1.2",
  "1.2.1",
  "1.2.2",
  "1.2.3",
  "1.2.9",
  "1.3.2",
  "1.3.3",
  "1.3.5",
  "1.3.6",
  "1.3.7",
  "1.3.10",
  "1.4.1",
  "1.4.2",
  "1.4.3",
  "1.5.2",
  "2.1.1",
  "2.1.2",
  "2.1.3",
  "2.2.1",
  "2.2.2",
  "2.2.3",
  "2.3.1",
  "2.3.2",
  "2.3.3",
  "2.4.1",
  "3.2.1",
  "3.2.2",
  "3.4.1",
  "3.4.2",
  "3.4.3",
  "3.4.4",
  "3.4.5",
  "3.4.6",
  "3.5.3",
  "3.5.4",
  "3.7.1",
  "3.7.2",
  "4.1.1",
  "4.1.2",
  "4.1.3",
  "4.2.1",
  "5.3.1",
  "5.3.2",
  "8.1.1",
  "8.1.2",
  "8.2.1",
  "8.2.2",
  "8.2.3",
  "8.3.1",
  "11.1.1",
  "11.1.2",
  "11.2.1",
  "11.2.2",
  "11.2.3",
  "11.4.1",
  "11.4.3",
  "11.5.1",
  "12.1.1",
  "12.1.2",
  "12.2.1",
  "12.2.2",
  "12.3.1",
  "12.3.2",
  "12.3.3",
  "12.3.4",
  "13.1.1",
  "13.2.2",
  "13.2.3",
  "13.2.4",
  "13.2.5",
  "13.3.1",
  "13.3.2",
  "13.4.1",
  "13.4.2",
  "13.4.3",
  "13.4.4",
  "13.4.5",
  "14.1.1",
  "14.1.2",
  "14.2.1",
  "14.2.2",
  "14.2.3",
  "14.2.4",
  "14.3.2",
  "14.3.3",
  "15.1.1",
  "15.1.2",
  "15.1.3",
  "15.2.1",
  "15.2.2",
  "15.2.3",
  "15.3.1",
  "15.3.2",
  "15.3.3",
  "15.3.4",
  "15.3.5",
  "15.3.6",
  "15.3.7",
  "16.1.1",
  "16.2.1",
  "16.2.2",
  "16.2.3",
  "16.2.4",
  "16.2.5",
  "16.3.2",
  "16.3.3",
  "16.3.4",
  "16.4.1",
  "16.4.2",
  "16.4.3",
  "16.5.1",
  "16.5.2",
  "16.5.3",
].map((id) => `v5.0.0-${id}`);
function exactRows(
  rows: unknown,
  expected: string[],
): rows is { id: string; status: string; exclusionApproved?: boolean }[] {
  if (!Array.isArray(rows)) return false;
  const found = rows.map((row) => row?.id);
  return (
    found.length === expected.length &&
    new Set(found).size === expected.length &&
    expected.every((id) => found.includes(id))
  );
}
export function publicAcceptanceBlockers(scenarios: unknown): string[] {
  if (!exactRows(scenarios, V1_ACCEPTANCE_IDS))
    return [
      `Public v1 evidence must contain each of its ${V1_ACCEPTANCE_IDS.length} required scenario IDs exactly once.`,
    ];
  const open = scenarios.filter((row) => row.status !== "PASS");
  return open.length
    ? [
        `${open.length} public v1 acceptance scenarios remain unresolved; see docs/v1-acceptance-evidence.json.`,
      ]
    : [];
}
export function asvsBlockers(controls: unknown, scope: ReleaseScope): string[] {
  if (
    scope === "v1"
      ? !exactRows(controls, V1_ASVS_IDS)
      : !Array.isArray(controls) ||
        controls.length !== 253 ||
        new Set(controls.map((row) => row?.id)).size !== 253
  )
    return [
      scope === "v1"
        ? "The exact public v1 ASVS applicability register is missing or incomplete."
        : "The complete versioned ASVS Level 2 review register is missing.",
    ];
  const rows = controls as { status: string; exclusionApproved?: boolean }[];
  const open = rows.filter(
    (row) =>
      row.status !== "PASS" &&
      !(row.status === "EXCLUDED" && row.exclusionApproved === true),
  );
  return open.length
    ? [
        `${open.length} ${scope} ASVS controls still require independent assessment or a specifically approved exclusion.`,
      ]
    : [];
}
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
export function evaluateRelease(
  input: ReleaseInput,
  scope: ReleaseScope = "v1",
): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (scope === "v1" && input.communityEnabled)
    blockers.push("Public v1 requires COMMUNITY_ENABLED to remain disabled.");
  if (scope === "community" && !input.communityEnabled)
    blockers.push(
      "The community release requires an explicitly enabled and fully verified community scope.",
    );
  if (input.activeIdeas === 0) blockers.push("The active corpus is empty.");
  if (input.timelineCount < 8)
    blockers.push(
      "At least eight genuine reviewed timeline articles are required.",
    );
  for (const contact of ["support", "security"])
    if (!input.contacts[contact])
      blockers.push(`A real monitored ${contact} contact is required.`);
  for (const legal of scope === "community"
    ? ["terms", "privacy", "community-rules", "accessibility"]
    : ["terms", "privacy", "accessibility"])
    if (!input.legal.includes(legal))
      blockers.push(`Approved ${legal} content is missing.`);
  const commonApprovals = [
    "visual",
    "artworkRights",
    "ideaEditorial",
    "legal",
    "independentSecurityReview",
    "manualAccessibility",
    "loadAndPerformance",
    "productionAuthorization",
  ];
  for (const gate of [
    ...commonApprovals,
    ...(scope === "community"
      ? [
          "providersBudgetRegion",
          "moderationStaffing",
          "restoreDrill",
          "stagingIntegrations",
        ]
      : ["publicHosting", "publicDeploymentReview"]),
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
  const communityConfiguration = [
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
  ];
  for (const variable of scope === "community"
    ? communityConfiguration
    : ["APP_ORIGIN"])
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
