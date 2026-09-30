import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import nextConfig from "../next.config";

/** Mirror Next's existing rules for files Netlify serves without Next.js. */
export async function buildNetlifyHeaders(root = process.cwd()): Promise<void> {
  const rules = await nextConfig.headers!();
  const blocks = rules.map((rule) => {
    const path = rule.source.replaceAll(":path*", "*");
    if (path.includes(":") || rule.has?.length || rule.missing?.length)
      throw new Error(
        "Netlify static headers require unconditional glob paths.",
      );
    return `${path}\n${rule.headers
      .map(({ key, value }) => `  ${key}: ${value}`)
      .join("\n")}`;
  });
  mkdirSync(resolve(root, "public"), { recursive: true });
  writeFileSync(
    resolve(root, "public/_headers"),
    `${blocks.join("\n\n")}\n`,
    "utf8",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await buildNetlifyHeaders();
