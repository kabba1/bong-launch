import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { evaluateRelease, acceptanceBlockers } from "./release-policy";
import { candidateHash } from "./candidate";
import { siteSchema, policySchema } from "../src/lib/content-config";
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const site = siteSchema.parse(json("content/site.json"));
const manifest = json("content/generated/manifest.json");
const evidence = existsSync("docs/release-evidence.json")
  ? json("docs/release-evidence.json")
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
const evaluation = evaluateRelease({
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
});
const corpus = readFileSync(`public${manifest.url}`);
const acceptance = existsSync("docs/acceptance-evidence.json")
  ? json("docs/acceptance-evidence.json")
  : {};
evaluation.blockers.push(...acceptanceBlockers(acceptance.scenarios));
const asvs = existsSync("docs/asvs-5.0-l2-evidence.json")
  ? json("docs/asvs-5.0-l2-evidence.json")
  : {};
if (
  !Array.isArray(asvs.controls) ||
  asvs.controls.length !== 253 ||
  new Set(asvs.controls.map((control: { id: string }) => control.id)).size !==
    253
)
  evaluation.blockers.push(
    "The complete versioned ASVS Level 2 review register is missing.",
  );
else {
  const open = asvs.controls.filter(
    (control: { status: string; exclusionApproved?: boolean }) =>
      control.status !== "PASS" &&
      !(control.status === "EXCLUDED" && control.exclusionApproved === true),
  );
  if (open.length)
    evaluation.blockers.push(
      `${open.length} ASVS controls still require independent assessment or a specifically approved exclusion.`,
    );
}
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
if (process.env.PROVIDER_CAPTCHA_ENABLED !== "true")
  evaluation.blockers.push(
    "Provider Auth CAPTCHA has not been confirmed enabled.",
  );
if (
  process.env.APP_ENV === "production" &&
  !/^https:\/\//.test(process.env.APP_ORIGIN ?? "")
)
  evaluation.blockers.push("Production APP_ORIGIN must use HTTPS.");
if (
  process.env.APP_ENV === "production" &&
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
  `BONG release check — ${evaluation.blockers.length ? "NOT READY FOR PUBLIC LAUNCH" : "GATES SATISFIED"}\nCorpus: ${manifest.activeCount} active ideas · ${manifest.hash}`,
);
for (const blocker of evaluation.blockers) console.log(`BLOCKED: ${blocker}`);
if (evaluation.blockers.length) process.exitCode = 1;
