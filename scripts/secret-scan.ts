import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
const root = process.cwd();
const skipped = new Set([
  "node_modules",
  ".git",
  ".next",
  ".runtime",
  "coverage",
  "test-results",
  "playwright-report",
]);
const rules = [
  {
    name: "private-key material",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "credential-bearing database URL",
    pattern: /postgres(?:ql)?:\/\/[^\s:'"<>]+:[^\s@'"<>]+@/i,
  },
  {
    name: "Supabase privileged credential",
    pattern: /sb_secret_[A-Za-z0-9_-]{20,}/,
  },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "long assigned secret value",
    pattern:
      /(?:CSRF_SECRET|RATE_LIMIT_SECRET|LOG_HMAC_SECRET|MAINTENANCE_TOKEN|SUPABASE_STORAGE_SERVICE_KEY|SUPABASE_AUTH_ADMIN_KEY)\s*=\s*[A-Za-z0-9_+/=-]{24,}/,
  },
];
const findings: string[] = [];
let files = 0;
async function walk(directory: string, bundle = false): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!skipped.has(entry.name)) await walk(path, bundle);
      continue;
    }
    if (
      !/\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|html|css|txt|map)$/.test(
        entry.name,
      ) &&
      entry.name !== ".env.example"
    )
      continue;
    const value = await readFile(path, "utf8");
    files++;
    for (const rule of rules)
      if (rule.pattern.test(value))
        findings.push(`${relative(root, path)}: ${rule.name}`);
    if (
      bundle &&
      /SUPABASE_(?:STORAGE_SERVICE_KEY|AUTH_ADMIN_KEY)|BONG_(?:DATABASE|OWNER_DATABASE|MAINTENANCE_DATABASE)_URL/.test(
        value,
      )
    )
      findings.push(
        `${relative(root, path)}: server credential boundary marker in browser bundle`,
      );
  }
}
await walk(root);
try {
  await walk(join(root, ".next", "static"), true);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT")
    throw new Error(
      "Run the production build before scanning browser bundles.",
    );
  throw error;
}
console.log(
  `Secret scan: ${files} text/source/example/browser artifact files checked. Values are never printed.`,
);
for (const finding of findings) console.error(finding);
if (findings.length) process.exitCode = 1;
else
  console.log(
    "PASS: no matched secret material or privileged browser boundary markers. Pattern scanning does not replace independent review.",
  );
