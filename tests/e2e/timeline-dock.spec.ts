import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("natural document scrolling changes the active event and scene color", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/through-time");
  const timeline = page.locator(".chronology-scroll");
  const dots = page.locator(".chronology-dots button");
  await expect(dots).toHaveCount(7);
  await expect(dots.first()).toHaveAttribute("aria-current", "step");
  await expect(page.locator(".chronology-year-unit").first()).toHaveText(
    "million years ago",
  );
  const before = await timeline.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(
    page.locator('.chronology-chapter[data-active="true"]'),
  ).toContainText("3300 BCE");
  await expect
    .poll(() =>
      timeline.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(before);
});

test("dot buttons, previous and next, and keyboard endpoints follow the chronology", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/through-time");
  const dots = page.locator(".chronology-dots button");
  const active = page.locator('.chronology-chapter[data-active="true"]');
  const previous = page.getByRole("button", { name: "Previous event" });
  const next = page.getByRole("button", { name: "Next event" });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(active).toContainText("3300 BCE");
  await dots.nth(3).click();
  await expect(active).toContainText("Galileo");
  await expect(dots.nth(3)).toBeFocused();
  await dots.nth(3).press("End");
  await expect(dots.last()).toBeFocused();
  await expect(active).toContainText("Tim Berners-Lee");
  await expect(next).toBeDisabled();
  await dots.last().press("ArrowUp");
  await expect(active).toContainText("Apollo 11");
  await previous.click();
  await expect(active).toContainText("Wright brothers");
  await dots.nth(4).press("Home");
  await expect(dots.first()).toBeFocused();
  await expect(active).toContainText("Acheulean");
  await expect(previous).toBeDisabled();
  await expect(dots.first()).toHaveAccessibleName(
    "1.76 million years ago: A sharper idea",
  );
});

test("touch navigation respects reduced motion", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/through-time");
  const dots = page.locator(".chronology-dots button");
  await dots.nth(3).tap();
  await expect(dots.nth(3)).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#timeline-event-telescope h2")).toBeInViewport();
  expect(
    await page
      .locator("#timeline-event-telescope .chronology-glyph")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".chronology-scroll")
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
  await context.close();
});

for (const width of [568, 1280]) {
  test(`event navigation clears the header once at ${width}x320`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 320 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/through-time");
    const dots = page.locator(".chronology-dots button");
    const next = page.getByRole("button", { name: "Next event" });
    for (const index of [1, 2]) {
      await next.click();
      await expect(dots.nth(index)).toHaveAttribute("aria-current", "step");
      const clearance = await page
        .locator(".chronology-chapter")
        .nth(index)
        .evaluate((chapter) => {
          const navigation = document.querySelector(".chronology-navigation");
          if (!navigation) throw new Error("Timeline navigation is missing");
          return (
            chapter.getBoundingClientRect().top -
            navigation.getBoundingClientRect().bottom
          );
        });
      expect(clearance).toBeGreaterThanOrEqual(-1);
      expect(clearance).toBeLessThanOrEqual(1);
    }
    await page.getByRole("button", { name: "Previous event" }).click();
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "step");
  });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1280, height: 400 },
]) {
  test(`all events and sources remain reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/through-time");
    const sources = page.locator(".chronology-source");
    await expect(sources).toHaveCount(7);
    await expect(
      page.getByRole("button", { name: "Next event" }),
    ).toBeInViewport();
    const dotTargets = await page
      .locator(".chronology-dots button")
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const bounds = button.getBoundingClientRect();
          return {
            left: bounds.left,
            right: bounds.right,
            width: bounds.width,
            height: bounds.height,
          };
        }),
      );
    for (const target of dotTargets) {
      expect(target.width).toBeGreaterThanOrEqual(24);
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.left).toBeGreaterThanOrEqual(0);
      expect(target.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(
      await page
        .locator(".chronology-dots")
        .evaluate((rail) => rail.scrollWidth - rail.clientWidth),
    ).toBeLessThanOrEqual(1);
    for (const source of await sources.all()) {
      await source.scrollIntoViewIfNeeded();
      await expect(source).toBeInViewport();
      const bounds = await source.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("enlarged text grows the scenes instead of clipping historical content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 450 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/through-time");
  await page.evaluate(() => {
    document.documentElement.style.setProperty(
      "font-size",
      "200%",
      "important",
    );
  });
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  const sources = page.locator(".chronology-source");
  for (const source of await sources.all()) {
    await source.scrollIntoViewIfNeeded();
    await expect(source).toBeInViewport();
  }
  const clipped = await page
    .locator(".chronology-scene")
    .evaluateAll((scenes) =>
      scenes.some((scene) => scene.scrollHeight > scene.clientHeight + 1),
    );
  expect(clipped).toBe(false);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(640);
});

test("all history and source links remain readable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto("/through-time");
  await expect(page.locator("main article.chronology-scene")).toHaveCount(7);
  await expect(page.locator(".chronology-source")).toHaveCount(7);
  await expect(
    page.getByRole("navigation", { name: "Historical timeline" }),
  ).toBeHidden();
  await expect(
    page.getByText("Tim Berners-Lee", { exact: false }),
  ).toBeVisible();
  const flightSource = page.locator(
    'a[href="https://www.nps.gov/articles/firstflight.htm"]',
  );
  await flightSource.scrollIntoViewIfNeeded();
  await expect(flightSource).toBeInViewport();
  await expect(page.locator(".chronology-year-unit").first()).toHaveText(
    "million years ago",
  );
  await context.close();
});
