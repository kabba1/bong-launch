import { test, expect } from "@playwright/test";

test("large bubbles repel and pop while cursor-trail bubbles drift naturally", async ({
  page,
}) => {
  type Circle = { x: number; y: number; radius: number };
  type RecordedWindow = Window & { bubbleCircles: Circle[] };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install({ time: new Date("2026-10-01T12:00:00Z") });
  await page.addInitScript(() => {
    const recorded = window as unknown as RecordedWindow;
    recorded.bubbleCircles = [];
    const prototype = CanvasRenderingContext2D.prototype;
    const clear = prototype.clearRect;
    const arc = prototype.arc;
    prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("bubble-field"))
        recorded.bubbleCircles = [];
      return clear.apply(this, args);
    };
    prototype.arc = function (...args) {
      if (this.canvas.classList.contains("bubble-field")) {
        const [x, y, radius] = args;
        recorded.bubbleCircles.push({ x, y, radius });
      }
      return arc.apply(this, args);
    };
    // Repeatable initial bubble positions; the production animation remains unmodified.
    let seed = 2026;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await page.goto("/");
  const circles = () =>
    page.evaluate(() => (window as unknown as RecordedWindow).bubbleCircles);
  await expect
    .poll(async () => (await circles()).filter((b) => b.radius >= 18).length)
    .toBe(8);
  await page.clock.pauseAt(new Date("2026-10-01T12:01:00Z"));
  const bounds = (await page.locator(".bubble-field").boundingBox())!;
  const ambient = () =>
    circles().then((items) => items.filter((b) => b.radius >= 18));
  const initial = await ambient();
  const index = initial.findIndex(
    (b) =>
      b.x > 100 &&
      b.x < bounds.width - 100 &&
      b.y > 100 &&
      b.y < Math.min(bounds.height, 1000 - bounds.y) - 100,
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const before = initial[index];
  await page.mouse.move(bounds.x + before.x - 30, bounds.y + before.y);
  await page.clock.runFor(160);
  const pushed = (await ambient())[index];
  expect(pushed.x - before.x).toBeGreaterThan(12);
  const trail = (await circles()).at(-1)!;
  expect(trail.radius).toBeLessThanOrEqual(5);
  expect(
    Math.hypot(trail.x - (before.x - 30), trail.y - before.y),
  ).toBeLessThan(6);

  await page.mouse.move(10, 10);
  await page.clock.runFor(160);
  const released = (await ambient())[index];
  expect(Math.abs(released.x - pushed.x)).toBeLessThan(2);

  await page.mouse.click(bounds.x + released.x, bounds.y + released.y);
  await page.clock.runFor(16);
  const popped = await circles();
  expect(
    popped.some(
      (b) =>
        b.radius === released.radius &&
        Math.hypot(b.x - released.x, b.y - released.y) < 40,
    ),
  ).toBe(false);
  expect(
    popped.filter(
      (b) =>
        b.radius >= 3 &&
        b.radius < released.radius &&
        Math.hypot(b.x - released.x, b.y - released.y) < 25,
    ).length,
  ).toBeGreaterThanOrEqual(8);
  expect(
    popped.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y)),
  ).toBe(true);
});

test("decorative bubbles can be paused and respect reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const pixels = () =>
    page
      .locator(".bubble-field")
      .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await expect
    .poll(() =>
      page.locator(".bubble-field").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.some((value, index) => index % 4 === 3 && value > 0);
      }),
    )
    .toBe(true);
  const moving = await pixels();
  await expect.poll(pixels).not.toBe(moving);
  await page.getByRole("button", { name: "Pause bubbles" }).click();
  const paused = page.getByRole("button", { name: "Resume bubbles" });
  await expect(paused).toHaveAttribute("aria-pressed", "true");
  const still = await pixels();
  await page.waitForTimeout(120);
  expect(await pixels()).toBe(still);
  await paused.click();
  await expect.poll(pixels).not.toBe(still);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".bubble-field")).toBeHidden();
  await expect(page.locator(".bubble-toggle")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Give me an idea", exact: true }),
  ).toBeEnabled();
});

test("the mobile rebrand brings each generated idea and its actions into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea from the bong" })
    .click();
  const result = page.locator(".generator-card");
  await expect(result).toBeInViewport({ ratio: 0.98 });
  await expect(
    result.getByRole("button", { name: "Copy idea" }),
  ).toBeInViewport();
  await expect(
    result.getByRole("button", { name: "Share", exact: true }),
  ).toBeInViewport();
  const first = await page
    .locator("[data-idea-id]")
    .getAttribute("data-idea-id");
  await page.getByRole("button", { name: "Another idea", exact: true }).click();
  await expect(page.locator("[data-idea-id]")).not.toHaveAttribute(
    "data-idea-id",
    first!,
  );
  await expect(result).toBeInViewport({ ratio: 0.98 });
});
