import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const probeMarker = "V1_CLI_PROVIDER_ACCESS";
// The child process can import code but cannot read provider configuration or
// perform a fetch. A premature attempt is recorded even when the CLI catches
// the thrown error. Every configured value below is a harmless test fixture.
const probe = `
function blocked() {
  process.stderr.write('${probeMarker}\\n');
  throw new Error('Test blocked provider access');
}
globalThis.fetch = blocked;
process.env = new Proxy(process.env, {
  get(target, key) {
    if (typeof key === 'string' && /^(?:BONG_(?:MIGRATION|OWNER|MAINTENANCE|DATABASE)_|SUPABASE_|TURNSTILE_|RATE_LIMIT_SECRET)/.test(key)) blocked();
    return Reflect.get(target, key);
  }
});
`;
const commands = [
  { name: "migrations", script: "scripts/db-migrate.ts", args: [] },
  {
    name: "staff",
    script: "scripts/staff.ts",
    args: [
      "--action",
      "grant",
      "--userId",
      "00000000-0000-4000-8000-000000000001",
      "--role",
      "moderator",
      "--reason",
      "Isolated denial fixture only",
    ],
  },
  { name: "maintenance", script: "scripts/maintenance.ts", args: [] },
] as const;

function run(command: (typeof commands)[number], enabled?: string) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Do not load any developer/provider credentials from a local dotenv file.
    DOTENV_CONFIG_PATH: resolve(root, "tests/.missing-v1-cli.env"),
    BONG_MIGRATION_DATABASE_URL: "invalid-migration-fixture",
    BONG_OWNER_DATABASE_URL: "invalid-owner-fixture",
    BONG_MAINTENANCE_DATABASE_URL: "invalid-maintenance-fixture",
    BONG_DATABASE_URL: "invalid-runtime-fixture",
    SUPABASE_URL: "invalid-provider-fixture",
    SUPABASE_AUTH_ADMIN_KEY: "invalid-key-fixture",
  };
  if (enabled === undefined) delete env.COMMUNITY_ENABLED;
  else env.COMMUNITY_ENABLED = enabled;
  return spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      `data:text/javascript,${encodeURIComponent(probe)}`,
      "--import",
      "tsx",
      command.script,
      ...command.args,
    ],
    { cwd: root, env, encoding: "utf8", timeout: 15000 },
  );
}

describe("V1-CLI default-off private administration", () => {
  for (const command of commands) {
    for (const flag of [undefined, "false"]) {
      it(`${command.name} refuses before provider/config access with COMMUNITY_ENABLED=${flag ?? "absent"}`, () => {
        const child = run(command, flag);
        expect(child.error).toBeUndefined();
        expect(child.status).toBe(1);
        expect(child.stdout).not.toMatch(
          /Content validate|committed|completed/,
        );
        expect(child.stderr).not.toContain(probeMarker);
        expect(child.stderr).not.toContain("invalid-key-fixture");
      });
    }
    it(`${command.name} retains the explicit community opt-in path; the test intercepts provider access`, () => {
      const child = run(command, "true");
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(1);
      expect(child.stderr).toContain(probeMarker);
      expect(child.stdout).not.toMatch(/committed|completed/);
    });
  }
});
