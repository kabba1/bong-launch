import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  configurationBlockers,
  releaseMode,
  runTechnicalChecks,
  technicalChecks,
} from "../../scripts/release-policy";

describe("public v1 engineering readiness", () => {
  it("starts the real CLI and rejects an unconfigured production environment", () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/release-check.ts", "--production"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          APP_ENV: "staging",
          APP_ORIGIN: "http://127.0.0.1:3210",
          COMMUNITY_ENABLED: "false",
        },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "BONG v1 engineering verification (production)",
    );
    expect(result.stderr).toContain("FAIL configuration:");
    expect(result.stderr).toContain("APP_ENV=production");
    expect(result.stdout).not.toContain("Checking lint");
  });
  it("accepts local and staging verification without contacts or approval records", () => {
    expect(configurationBlockers({}, "local")).toEqual([]);
    expect(
      configurationBlockers(
        { APP_ENV: "staging", COMMUNITY_ENABLED: "false" },
        "local",
      ),
    ).toEqual([]);
  });
  it("rejects enabled or ambiguous participation flags", () => {
    for (const name of [
      "COMMUNITY_ENABLED",
      "REGISTRATIONS_ENABLED",
      "POSTING_ENABLED",
      "UPLOADS_ENABLED",
    ]) {
      for (const value of ["true", "TRUE", "1", "maybe"])
        expect(
          configurationBlockers({ [name]: value }, "local").some((message) =>
            message.includes(name),
          ),
        ).toBe(true);
    }
  });
  it("does not expose owner or migration credentials in the application runtime", () => {
    for (const name of [
      "BONG_OWNER_DATABASE_URL",
      "BONG_MIGRATION_DATABASE_URL",
    ])
      expect(
        configurationBlockers(
          { [name]: "isolated-test-marker" },
          "local",
        ).join(),
      ).toContain(name);
  });
  it("requires explicit production mode and a safe production origin", () => {
    expect(
      configurationBlockers(
        { APP_ENV: "production", APP_ORIGIN: "https://bongrippin.com" },
        "production",
      ),
    ).toEqual([]);
    expect(
      configurationBlockers(
        { APP_ENV: "staging", APP_ORIGIN: "https://bongrippin.com" },
        "production",
      ).join(),
    ).toContain("APP_ENV");
    for (const origin of [
      undefined,
      "http://bongrippin.com",
      "https://localhost",
      "https://127.0.0.1",
      "https://[::1]",
      "https://user:password@bongrippin.com",
      "https://bongrippin.com/path",
      "https://bongrippin.com/?x=1",
      "https://bongrippin.com/#x",
      " https://bongrippin.com",
    ])
      expect(
        configurationBlockers(
          { APP_ENV: "production", APP_ORIGIN: origin },
          "production",
        ).join(),
      ).toContain("APP_ORIGIN");
  });
  it("cannot bypass production validation or silently accept mistyped options", () => {
    expect(releaseMode([], {})).toBe("local");
    expect(releaseMode(["--production"], {})).toBe("production");
    expect(releaseMode([], { APP_ENV: "production" })).toBe("production");
    expect(releaseMode(["--scope=v1"], {})).toBe("local");
    for (const args of [
      ["--scope=community"],
      ["--prodution"],
      ["--production", "--production"],
    ])
      expect(() => releaseMode(args, {})).toThrow();
    expect(
      configurationBlockers({ APP_ENV: "prodution" }, "local").join(),
    ).toContain("APP_ENV");
  });
  it("executes fresh required checks without consulting historical evidence", () => {
    const called: string[] = [];
    const result = runTechnicalChecks((script) => {
      called.push(script);
      return true;
    });
    expect(called).toEqual(technicalChecks);
    expect(called).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(result.every((check) => check.status === "PASS")).toBe(true);
  });
  it("retains a failing check even when every other check passes", () => {
    const result = runTechnicalChecks((script) => script !== "test:security");
    expect(
      result.find((check) => check.script === "test:security")?.status,
    ).toBe("FAIL");
    expect(result.find((check) => check.script === "test:a11y")?.status).toBe(
      "PASS",
    );
  });
  it("does not certify stale build artifacts after a failed build", () => {
    const called: string[] = [];
    const result = runTechnicalChecks((script) => {
      called.push(script);
      return script !== "build";
    });
    expect(called).not.toContain("test:e2e");
    expect(called).not.toContain("test:a11y");
    expect(called).not.toContain("security:scan");
    expect(
      result
        .filter((check) => check.status === "SKIP")
        .map((check) => check.script),
    ).toEqual(["security:scan", "test:e2e", "test:a11y"]);
  });
});
