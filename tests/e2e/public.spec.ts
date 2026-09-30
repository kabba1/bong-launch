import { test, expect } from "@playwright/test";
test("@community BOARD-14 GEN-14 failure is truthful and generator remains usable", async ({
  page,
}) => {
  await page.goto("/board");
  await expect(page.locator('main [role="alert"]')).toBeVisible();
  await expect(page.getByText("Somebody has to go first.")).toHaveCount(0);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await expect(page.locator("[data-idea-id]")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Discuss this", exact: true }),
  ).toHaveAttribute("href", /^\/board\/new\?sourceIdeaId=BONG-\d{4}$/);
});
test("GEN-06 storage denial keeps local generation usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await expect(page.locator("[data-idea-id]")).toBeVisible();
  await expect(
    page.getByText("Your browser isn’t saving progress.", { exact: false }),
  ).toBeVisible();
});
test("GEN-09 reduced motion draws without a decorative delay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await expect(
    page
      .locator(".generator-actions")
      .getByRole("button", { name: "Another idea", exact: true }),
  ).toBeEnabled();
  const activeAnimations = await page.evaluate(
    () =>
      document.getAnimations().filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return (
          target instanceof Element &&
          !!target.closest(".hero") &&
          animation.playState === "running"
        );
      }).length,
  );
  expect(activeAnimations).toBe(0);
});
test("GEN-10 clipboard denial offers selectable exact text", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await page.getByRole("button", { name: "Copy idea", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Text to copy" })).toHaveValue(
    await page.locator(".idea-text").innerText(),
  );
});
test("GEN-11 cancellation is not reported as an error", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: () => Promise.reject(new DOMException("Canceled", "AbortError")),
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Text to copy" })).toHaveCount(
    0,
  );
});
test("@community BOARD-10 draft survives reload and source does not submit itself", async ({
  page,
}) => {
  await page.goto("/board/new?sourceIdeaId=BONG-0001");
  await page
    .getByLabel("Give it a title")
    .fill("A genuinely useful pizza thought");
  await page
    .getByLabel("Hear me out…", { exact: true })
    .fill(
      "What if the toppings also came with a little diagram of the best combinations?",
    );
  await page.reload();
  await expect(page.getByLabel("Give it a title")).toHaveValue(
    "A genuinely useful pizza thought",
  );
  await expect(
    page.getByRole("button", { name: "Share your thought", exact: true }),
  ).toBeDisabled();
});
test("TIME-08/09 no invented history is published", async ({
  page,
  request,
}) => {
  await page.goto("/through-time");
  await expect(
    page.getByRole("heading", { name: "Bong Through Time.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "No stories published yet.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search history" }),
  ).toHaveCount(0);
  expect((await request.get("/through-time/a-made-up-article")).status()).toBe(
    404,
  );
});
test("@community SEC-05/06 invalid browser writes and mutation GETs fail", async ({
  request,
}) => {
  for (const path of [
    "/api/auth/sign-out",
    "/api/auth/request-code",
    "/api/board/posts",
  ]) {
    const r = await request.post(path, {
      headers: {
        Origin: "https://evil.invalid",
        "Content-Type": "application/json",
        "X-Bong-Request": "1",
      },
      data: {},
    });
    expect(r.status()).toBe(403);
  }
  expect((await request.get("/api/auth/sign-out")).status()).toBe(405);
});
test("UX-01 public pages reflow at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of [
    "/",
    "/through-time",
    "/community",
    "/about",
    ...(process.env.COMMUNITY_ENABLED === "true"
      ? ["/board", "/board/new", "/sign-in"]
      : []),
    "/privacy",
    "/contact",
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
});
