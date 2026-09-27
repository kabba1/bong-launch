import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("UX-01/07 capture core desktop/mobile screens", async ({ page }) => {
  test.setTimeout(90000);
  await mkdir("../bong_codex_handoff/.build-evidence/screenshots", {
    recursive: true,
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const [name, route] of [
      ["home", "/"],
      ["timeline", "/through-time"],
      ["board", "/board"],
      ["composer", "/board/new"],
      ["sign-in", "/sign-in"],
      ["account", "/account"],
      ["moderation", "/moderation"],
      ["about", "/about"],
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (route === "/") {
        await page
          .getByRole("button", { name: "Give me an idea", exact: true })
          .click();
        await expect(page.locator("[data-idea-id]")).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Another idea", exact: true }),
        ).toBeEnabled();
      }
      await page.screenshot({
        path: `../bong_codex_handoff/.build-evidence/screenshots/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
