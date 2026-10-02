import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("UX-01/07 capture public brand screens and reflow at phone, tablet, laptop and desktop widths", async ({
  page,
}) => {
  test.setTimeout(120000);
  const folder =
    ".runtime/screenshots" +
    (process.env.COMMUNITY_ENABLED === "true" ? "/community-v2" : "");
  await mkdir(folder, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const [name, route] of [
      ["home", "/"],
      ["through-time", "/through-time"],
      ["community", "/community"],
      ...(process.env.COMMUNITY_ENABLED === "true"
        ? [
            ["board", "/board"],
            ["composer", "/board/new"],
            ["sign-in", "/sign-in"],
            ["account", "/account"],
            ["moderation", "/moderation"],
          ]
        : []),
      ["about", "/about"],
    ]) {
      await page.goto(route);
      if (route === "/") {
        await page.evaluate(() => localStorage.removeItem("bong:deck:v1"));
        await page.reload();
      }
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
      if (route === "/") {
        const firstDraw = page.getByRole("button", {
          name: "Give me an idea",
          exact: true,
        });
        await expect(firstDraw).toBeEnabled();
        await page.screenshot({
          path: `${folder}/home-pre-result-${width}.png`,
          fullPage: true,
        });
        if (width === 1440) {
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await expect(page.locator(".bubble-field")).toBeVisible();
          await page.screenshot({
            path: `${folder}/home-desktop-preview.png`,
            fullPage: false,
          });
          await page.emulateMedia({ reducedMotion: "reduce" });
        }
        await firstDraw.click();
        await expect(page.locator("[data-idea-id]")).toBeVisible();
        await expect(
          page
            .locator(".generator-actions")
            .getByRole("button", { name: "Another idea", exact: true }),
        ).toBeEnabled();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `generated result at ${width}px`,
        ).toBe(true);
      }
      await page.screenshot({
        path: `${folder}/${name === "home" ? "home-result" : name}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
