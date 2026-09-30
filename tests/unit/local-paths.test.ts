import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const localUserPath = /(?:[a-z]:[\\/]+Users[\\/]+|\/(?:Users|home)\/)/i;

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
  });
}

describe("portable public source and documentation (SEC-14)", () => {
  it("detects Windows and Unix user paths while allowing relative paths", () => {
    for (const path of [
      ["C:", "Users", "local-user", "project"].join("/"),
      ["C:", "Users", "local-user", "project"].join("\\"),
      ["", "Users", "local-user", "project"].join("/"),
      ["", "home", "local-user", "project"].join("/"),
    ])
      expect(localUserPath.test(path)).toBe(true);
    for (const path of ["docs/RELEASE_REPORT.md", "./src/app", "<repo-root>"])
      expect(localUserPath.test(path)).toBe(false);
  });

  it("rejects absolute local user paths in docs, content and src", () => {
    const root = resolve();
    const leaks = ["docs", "content", "src"]
      .flatMap((directory) => files(join(root, directory)))
      .filter((path) => localUserPath.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path).replaceAll("\\", "/"));
    // Report only relative filenames; never reproduce the leaked personal path.
    expect(leaks, "Remove local user paths from these files").toEqual([]);
  });
});
