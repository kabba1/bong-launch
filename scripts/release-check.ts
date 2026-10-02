import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import {
  configurationBlockers,
  releaseMode,
  runTechnicalChecks,
} from "./release-policy";

// Match Next's production-build .env precedence without logging file contents.
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const mode = releaseMode(process.argv.slice(2), process.env);
const blockers = configurationBlockers(process.env, mode);
console.log(`BONG v1 engineering verification (${mode})`);
if (blockers.length) {
  for (const blocker of blockers)
    console.error(`FAIL configuration: ${blocker}`);
  process.exitCode = 1;
} else {
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error("Run this command through npm run release:check.");
  const directory = resolve(".runtime/release-check");
  mkdirSync(directory, { recursive: true });
  // Browser regressions exercise the existing staging/noindex behavior. The
  // production configuration above is inspected, never written to any host.
  const env = {
    ...process.env,
    APP_ENV: "staging",
    APP_ORIGIN: "http://127.0.0.1:3210",
    COMMUNITY_ENABLED: "false",
    REGISTRATIONS_ENABLED: "false",
    POSTING_ENABLED: "false",
    UPLOADS_ENABLED: "false",
    BONG_E2E_SCOPE: "v1",
  };
  const results = runTechnicalChecks(
    (script) => {
      console.log(`Checking ${script}…`);
      const logfile = resolve(directory, `${script.replaceAll(":", "-")}.log`);
      const descriptor = openSync(logfile, "w");
      try {
        const child = spawnSync(process.execPath, [npm, "run", script], {
          env,
          stdio: ["ignore", descriptor, descriptor],
        });
        if (child.error)
          console.error(`Could not run ${script}: ${child.error.message}`);
        return child.status === 0;
      } finally {
        closeSync(descriptor);
      }
    },
    (result) => {
      console.log(
        `${result.status} ${result.script}${result.status === "SKIP" ? " (requires a successful build)" : ""}`,
      );
      if (result.status === "FAIL") {
        const logfile = resolve(
          directory,
          `${result.script.replaceAll(":", "-")}.log`,
        );
        console.error(
          readFileSync(logfile, "utf8")
            .trim()
            .split(/\r?\n/)
            .slice(-24)
            .join("\n"),
        );
      }
    },
  );
  const failures = results.filter((result) => result.status !== "PASS");
  writeFileSync(
    resolve(directory, "summary.json"),
    JSON.stringify(
      { checkedAt: new Date().toISOString(), mode, results },
      null,
      2,
    ) + "\n",
  );
  console.log(
    failures.length
      ? `Engineering checks incomplete: ${failures.map((result) => result.script).join(", ")}.`
      : "PASS: all 11 engineering checks passed.",
  );
  console.log(
    "Logs: .runtime/release-check/. Human launch decisions: docs/V1_LAUNCH.md. No deployment performed.",
  );
  if (mode === "local")
    console.log(
      "Production configuration was not evaluated. Use --production with the intended production environment when preparing to launch.",
    );
  if (failures.length) process.exitCode = 1;
}
