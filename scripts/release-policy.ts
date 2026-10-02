export type ReleaseMode = "local" | "production";
type Environment = Record<string, string | undefined>;

export function productionOriginBlockers(value: string | undefined): string[] {
  try {
    if (!value || value !== value.trim()) throw new Error();
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
      throw new Error();
    return [];
  } catch {
    return [
      "Production APP_ORIGIN must be a non-loopback HTTPS origin without credentials, path, query or fragment.",
    ];
  }
}

export function releaseMode(
  args: string[],
  env: Environment,
): ReleaseMode {
  if (
    args.length > 1 ||
    (args.length === 1 && !["--production", "--scope=v1"].includes(args[0]))
  )
    throw new Error(
      "Use release:check, release:check -- --production, or the separate release:check:community command.",
    );
  return args[0] === "--production" || env.APP_ENV === "production"
    ? "production"
    : "local";
}

export function configurationBlockers(
  env: Environment,
  mode: ReleaseMode,
): string[] {
  const blockers: string[] = [];
  if (
    env.APP_ENV &&
    !["local", "staging", "preview", "production"].includes(env.APP_ENV)
  )
    blockers.push("APP_ENV must be local, staging, preview or production.");
  for (const key of [
    "COMMUNITY_ENABLED",
    "REGISTRATIONS_ENABLED",
    "POSTING_ENABLED",
    "UPLOADS_ENABLED",
  ])
    if (env[key] && env[key] !== "false")
      blockers.push(`Public v1 requires ${key} to be false or unset.`);
  for (const key of ["BONG_OWNER_DATABASE_URL", "BONG_MIGRATION_DATABASE_URL"])
    if (env[key])
      blockers.push(
        `${key} must be absent from the application environment; reserve it for the separate privileged CLI.`,
      );
  if (mode === "production") {
    if (env.APP_ENV !== "production")
      blockers.push(
        "Production verification requires APP_ENV=production in the environment being evaluated.",
      );
    blockers.push(...productionOriginBlockers(env.APP_ORIGIN));
  }
  return blockers;
}

export const technicalChecks = [
  "lint",
  "typecheck",
  "content:validate",
  "test:unit",
  "test:integration",
  "test:security",
  "build",
  "security:scan",
  "security:audit",
  "test:e2e",
  "test:a11y",
];
export type CheckResult = { script: string; status: "PASS" | "FAIL" | "SKIP" };

export function runTechnicalChecks(
  execute: (script: string) => boolean,
  report?: (result: CheckResult) => void,
): CheckResult[] {
  const results: CheckResult[] = [];
  let built = false;
  for (const script of technicalChecks) {
    const needsBuild = ["security:scan", "test:e2e", "test:a11y"].includes(
      script,
    );
    const status: CheckResult["status"] =
      needsBuild && !built ? "SKIP" : execute(script) ? "PASS" : "FAIL";
    if (script === "build") built = status === "PASS";
    const result: CheckResult = { script, status };
    results.push(result);
    report?.(result);
  }
  return results;
}
