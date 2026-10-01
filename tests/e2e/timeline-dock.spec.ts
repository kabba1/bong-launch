import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("dock magnification follows the pointer without changing the selected story", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/through-time");
  const tabs = page.getByRole("tab");
  const tiles = page.locator(".chronology-tile");
  await expect(tiles).toHaveCount(7, { timeout: 3000 });
  const width = (index: number) =>
    tiles.nth(index).evaluate((el) => el.getBoundingClientRect().width);
  const resting = await width(3);
  await tabs.nth(3).hover();
  await expect.poll(() => width(3)).toBeGreaterThan(resting * 1.4);
  await expect.poll(() => width(2)).toBeGreaterThan(resting * 1.1);
  expect(await width(2)).toBeLessThan(await width(3));
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Acheulean");
  await page.screenshot({ path: testInfo.outputPath("dock-hover.png") });
  const enlarged = await tiles.nth(3).boundingBox();
  if (!enlarged) throw new Error("Enlarged tile is missing");
  await page.mouse.click(enlarged.x + enlarged.width / 2, enlarged.y + 8);
  await expect(page.getByRole("tabpanel")).toContainText("Galileo");
  await page.mouse.move(5, 5);
  await expect.poll(() => width(2)).toBeLessThan(resting * 1.02);
});

test("dock respects reduced motion and supports touch selection", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3210/through-time");
  const tabs = page.getByRole("tab");
  const tile = tabs.nth(1).locator(".chronology-tile");
  await expect(tile).toBeVisible({ timeout: 3000 });
  const before = await tile.evaluate((el) => el.getBoundingClientRect().width);
  await tabs.nth(1).tap();
  await expect(page.getByRole("tabpanel")).toContainText("3300 BCE");
  await tabs.nth(1).hover();
  expect(
    await tile.evaluate((el) => el.getBoundingClientRect().width),
  ).toBeCloseTo(before, 1);
  await context.close();
});

test("dates, arrow buttons and keyboard endpoints select the same event", async ({
  page,
}) => {
  await page.goto("/through-time");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Previous event" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next event" }).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("3300 BCE");
  await tabs.nth(1).press("End");
  await expect(tabs.last()).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Tim Berners-Lee");
  await expect(page.getByRole("button", { name: "Next event" })).toBeDisabled();
  await tabs.last().press("ArrowLeft");
  await expect(page.getByRole("tabpanel")).toContainText("Apollo 11");
  await tabs.nth(5).press("Home");
  await expect(tabs.first()).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Acheulean");
  await expect(
    page.getByRole("button", { name: "Previous event" }),
  ).toBeDisabled();
});

for (const width of [320, 390, 1280]) {
  test(`timeline keeps controls in view and avoids horizontal page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 844 });
    await page.goto("/through-time");
    const next = page.getByRole("button", { name: "Next event" });
    await expect(next).toBeInViewport();
    const before = await page.evaluate(() => scrollY);
    await next.click();
    await expect(page.getByRole("tabpanel")).toContainText("3300 BCE");
    expect(await page.evaluate(() => scrollY)).toBe(before);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("dragging the rail scrolls without selecting an accidental event", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto("/through-time");
  const rail = page.getByRole("tablist");
  const bounds = await rail.boundingBox();
  if (!bounds) throw new Error("Timeline rail is missing");
  await page.mouse.move(bounds.x + 550, bounds.y + 32);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 160, bounds.y + 32, { steps: 12 });
  await page.mouse.up();
  expect(await rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(
    100,
  );
  await expect(page.getByRole("tabpanel")).toContainText("Acheulean");
  await page.getByRole("tab").nth(3).click();
  await expect(page.getByRole("tabpanel")).toContainText("Galileo");
});

test("history and sources remain readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3210/through-time");
  await expect(page.locator("main article")).toHaveCount(7);
  await expect(
    page.getByText("Tim Berners-Lee", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="https://www.nps.gov/articles/firstflight.htm"]'),
  ).toBeVisible();
  await context.close();
});
