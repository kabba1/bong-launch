import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
export function candidateHash(root = process.cwd()) {
  const hash = createHash("sha256");
  const files: string[] = [];
  const collect = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) collect(child);
      else files.push(child);
    }
  };
  for (const folder of [
    "src",
    "scripts",
    "supabase",
    "tests",
    "schemas",
    "assets",
    "content",
    "public",
    ".github",
  ])
    if (existsSync(resolve(root, folder))) collect(resolve(root, folder));
  for (const name of [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "vitest.config.ts",
    "playwright.config.ts",
    ".env.example",
  ])
    files.push(resolve(root, name));
  for (const file of files.sort()) {
    hash.update(relative(root, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}
