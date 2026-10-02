import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  evaluateRelease,
  acceptanceBlockers,
  asvsBlockers,
  productionOriginBlockers,
  evidenceScopeBlockers,
} from "./release-policy";
import { candidateHash } from "./candidate";
import { siteSchema, policySchema } from "../../src/lib/content-config";
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
// Historical full Community-v2 framework. Never part of public-v1 readiness.
if (process.argv.length > 2)
  throw new Error(
    "Use npm run release:check:community without scope arguments.",
  );
const scope = "community";
const archive = "docs/archive/generated-spec";
const site = siteSchema.parse(json("content/site.json"));
const manifest = json("content/generated/manifest.json");
const evidence = existsSync(
  `${archive}/history/pre-v1-scope-release-evidence.json`,
)
  ? json(`${archive}/history/pre-v1-scope-release-evidence.json`)
  : { checks: {} };
const entries = json("content/generated/timeline.json");
const configured = Object.entries(process.env)
  .filter(([, value]) => !!value)
  .map(([key]) => key);
const legal = readdirSync("content/legal")
  .filter((f) => f.endsWith(".json"))
  .filter((f) => {
    return policySchema.safeParse(json(`content/legal/${f}`)).success;
  })
  .map((f) => f.replace(".json", ""));
const evaluation = evaluateRelease(
  {
    timelineCount: Array.isArray(entries)
      ? entries.length
      : (entries.entries?.length ?? 0),
    activeIdeas: manifest.activeCount,
    contacts: site.contacts,
    legal,
    approvals: site.approvals,
    environment: process.env.APP_ENV ?? "local",
    configured,
    checks: evidence.checks ?? {},
    communityEnabled: process.env.COMMUNITY_ENABLED === "true",
  },
  scope,
);
evaluation.blockers.push(...evidenceScopeBlockers(evidence.scope, scope));
const corpus = readFileSync(`public${manifest.url}`);
const acceptancePath = `${archive}/acceptance-evidence.json`;
const acceptance = existsSync(acceptancePath) ? json(acceptancePath) : {};
evaluation.blockers.push(...acceptanceBlockers(acceptance.scenarios));
const asvsPath = `${archive}/asvs-5.0-l2-evidence.json`;
const asvs = existsSync(asvsPath) ? json(asvsPath) : {};
evaluation.blockers.push(...asvsBlockers(asvs.controls, scope));
if (asvs.exactCandidateSHA256 !== candidateHash())
  evaluation.blockers.push(
    "The ASVS working record is not bound to this source candidate.",
  );
if (acceptance.exactCandidateSHA256 !== candidateHash())
  evaluation.blockers.push(
    "The acceptance record is not bound to this exact source candidate.",
  );
if (evidence.candidateSHA256 !== candidateHash())
  evaluation.blockers.push(
    "Automated evidence does not identify this exact source candidate; rerun checks and record its hash.",
  );
if (createHash("sha256").update(corpus).digest("hex") !== manifest.hash)
  evaluation.blockers.push("Public artifact hash does not match its manifest.");
if (scope === "community" && process.env.PROVIDER_CAPTCHA_ENABLED !== "true")
  evaluation.blockers.push(
    "Provider Auth CAPTCHA has not been confirmed enabled.",
  );
if (process.env.APP_ENV === "production")
  evaluation.blockers.push(...productionOriginBlockers(process.env.APP_ORIGIN));
if (
  process.env.APP_ENV === "production" &&
  scope === "community" &&
  /^1x|^2x|^3x/.test(process.env.TURNSTILE_SITE_KEY ?? "")
)
  evaluation.blockers.push("Production must not use a Turnstile test key.");
if (
  process.env.BONG_OWNER_DATABASE_URL ||
  process.env.BONG_MIGRATION_DATABASE_URL
)
  evaluation.blockers.push(
    "Owner and migration credentials must be absent from the application release runtime.",
  );
console.log(
  `FUTURE COMMUNITY V2 — historical release framework (${evaluation.blockers.length ? "INCOMPLETE" : "GATES SATISFIED"})\nNot a public-v1 launch requirement.\nCorpus: ${manifest.activeCount} active ideas · ${manifest.hash}`,
);
for (const blocker of evaluation.blockers) console.log(`BLOCKED: ${blocker}`);
if (evaluation.blockers.length) process.exitCode = 1;
