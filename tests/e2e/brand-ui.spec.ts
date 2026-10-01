import { test, expect } from "@playwright/test";

test("@public-v1 UX-02 short pages keep the footer at the bottom without horizontal overflow", async ({
  page,
}) => {
  for (const width of [320, 1440]) {
    const height = width === 320 ? 844 : 1000;
    await page.setViewportSize({ width, height });
    for (const route of ["/community", "/contact", "/through-time"]) {
      await page.goto(route);
      const footer = await page.getByRole("contentinfo").boundingBox();
      expect(footer, route).not.toBeNull();
      expect(footer!.y + footer!.height, route).toBeGreaterThanOrEqual(
        height - 1,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        route,
      ).toBeLessThanOrEqual(width);
    }
  }
});

for (const width of [1440, 390])
  test(`@public-v1 GEN-01/02 UX-02 bong artwork and keyboard controls share the same deck at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const privateRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/"))
        privateRequests.push(request.url());
    });
    await page.goto("/");
    const artwork = page.getByRole("button", {
      name: "Give me an idea from the bong",
      exact: true,
    });
    await expect(artwork).toHaveCount(1);
    await expect(artwork).toBeEnabled();
    await artwork.click();
    const result = page.locator("[data-idea-id]");
    await expect(result).toBeVisible();
    const first = await result.getAttribute("data-idea-id");
    const primary = page.locator(".generator-actions").getByRole("button", {
      name: "Another idea",
      exact: true,
    });
    await expect(primary).toBeEnabled();
    await primary.focus();
    await expect(primary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(result).not.toHaveAttribute("data-idea-id", first!);
    const second = await result.getAttribute("data-idea-id");
    await expect(artwork).toBeEnabled();
    await artwork.focus();
    await expect(artwork).toBeFocused();
    await page.keyboard.press("Space");
    await expect(result).not.toHaveAttribute("data-idea-id", second!);
    const third = await result.getAttribute("data-idea-id");
    await expect(primary).toBeEnabled();
    await primary.click();
    await expect(result).not.toHaveAttribute("data-idea-id", third!);
    expect(
      new Set([first, second, third, await result.getAttribute("data-idea-id")])
        .size,
    ).toBe(4);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("bong:deck:v1")!),
    );
    expect(saved.cursor).toBe(4);
    expect(saved.history).toHaveLength(4);
    await expect(
      page.locator(".generator-card").getByRole("button"),
    ).toHaveText(["Copy idea", "Share"]);
    await expect(page.getByText("Recent ideas", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator('.hero [aria-live="polite"]')).toHaveAttribute(
      "aria-atomic",
      "true",
    );
    expect(privateRequests).toEqual([]);
  });

test("@public-v1 exact homepage copy keeps the generator and destinations clear", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator(".generator-actions .button.primary"),
  ).toBeEnabled();
  await expect
    .soft(page.getByRole("button", { name: "Give me an idea", exact: true }))
    .toBeEnabled({ timeout: 1000 });
  await expect
    .soft(page.locator(".hero-intro"))
    .toHaveCount(0, { timeout: 1000 });
  await expect
    .soft(page.locator(".art-caption"))
    .toHaveCount(0, { timeout: 1000 });
  await expect
    .soft(page.locator(".generator-card"))
    .toHaveCount(0, { timeout: 1000 });
  await expect(page.locator(".hero")).not.toContainText(
    "A home for half-baked ideas",
  );
  await expect(page).not.toHaveTitle(/A home for half-baked ideas/i);
  await expect(page.locator(".hero")).not.toContainText(
    /AI-origin|AI-powered|innovation platform|ecosystem|unlock your potential/i,
  );
  await expect
    .soft(page.locator(".ticker-strip"))
    .toHaveCount(0, { timeout: 1000 });
  await expect
    .soft(
      page.getByText("Curiosity welcome. Genius optional.", { exact: true }),
    )
    .toHaveCount(0, { timeout: 1000 });
  const destinations = page.locator(".thought-destination");
  await expect(destinations).toHaveCount(2);
  await expect(destinations.nth(0).getByRole("heading")).toHaveText(
    "Bong Through Time",
  );
  await expect(destinations.nth(0).locator("p")).toHaveText(
    "A closer look at human history.",
  );
  await expect(
    destinations
      .nth(0)
      .getByRole("link", { name: "Visit Through Time", exact: true }),
  ).toHaveAttribute("href", "/through-time");
  await expect(
    destinations.nth(0).getByText("Coming soon", { exact: true }),
  ).toBeVisible();
  await expect(destinations.nth(1).getByRole("heading")).toHaveText(
    "Community",
  );
  await expect(
    destinations.nth(1).getByText("Coming soon", { exact: true }),
  ).toBeVisible();
  await expect(
    destinations.nth(1).getByText("Share an idea. Show what you made.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    destinations
      .nth(1)
      .getByRole("link", { name: "About the community", exact: true }),
  ).toHaveAttribute("href", "/community");
});

test("@public-v1 home result contains only the idea and copy/share actions", async ({
  page,
}) => {
  await page.goto("/");
  const primary = page.locator(".generator-actions .button.primary");
  await expect(primary).toBeEnabled();
  await primary.click();
  const card = page.locator(".generator-card");
  const idea = card.locator(".idea-text");
  await expect(idea).toBeVisible();
  const ideaText = (await idea.textContent())!;
  expect
    .soft((await card.textContent())!.replace(/\s+/g, ""))
    .toBe(`${ideaText}Copy ideaShare`.replace(/\s+/g, ""));
  await expect
    .soft(card.getByRole("button"))
    .toHaveText(["Copy idea", "Share"], { timeout: 1000 });
  await expect.soft(card.getByRole("link")).toHaveCount(0, { timeout: 1000 });
  await expect
    .soft(page.getByRole("button", { name: "Another idea", exact: true }))
    .toBeEnabled({ timeout: 1000 });
  await expect
    .soft(page.getByText("Recent ideas", { exact: true }))
    .toHaveCount(0, { timeout: 1000 });
});

test("@public-v1 public copy and metadata omit quantity claims and repeated slogans", async ({
  page,
}) => {
  const pages = [
    [
      "/",
      "Click the bong for an idea. Explore Bong Through Time and find the BONG community.",
    ],
    [
      "/through-time",
      "Explore a timeline of human history, with sourced facts and short narration in BONG’s voice.",
    ],
    [
      "/community",
      "The BONG forum is coming soon. Find official community links here.",
    ],
    [
      "/about",
      "What BONG is, how the generator works, and official information about the associated memecoin.",
    ],
  ];
  for (const [route, description] of pages) {
    await page.goto(route);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      description,
    );
    // These marketing pages have no selected idea or published historical text.
    // Dataset records, archive IDs and numbers in approved content are exempt.
    await expect(page.locator("body")).not.toContainText(
      /\b1,?000\b|\bone thousand\b|\ba thousand\b|\b1k\b|\bunlimited\b|\binfinite\b|\bendless\b|freshly generated|a new idea every time|ever-growing collection/i,
    );
    await expect(page.locator("body")).not.toContainText(
      /Good thoughts deserve good company|Good things start with|Follow the thought|The original thought experiment|Big thoughts\. Small expectations\.|No prompt\. No account\.|Quality of thought may vary|Nobody said it had to be a good idea|We check the receipts|The sources remember|Keep that thought|No need to guess|Carefully served|Curiosity encouraged/i,
    );
    await expect(
      page.getByText("Curiosity welcome. Genius optional.", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/highdea/i);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute(
      "content",
      /highdea/i,
    );
    await expect(
      page.locator(
        '[aria-label*="highdea" i], [alt*="highdea" i], [title*="highdea" i]',
      ),
    ).toHaveCount(0);
    await expect(page.locator(".site-header")).not.toContainText(
      /AI|sign in|account/i,
    );
    await expect(page.locator("footer")).not.toContainText(
      /AI-origin|AI-powered|No live AI/i,
    );
    await expect(page.locator("footer")).not.toContainText(
      /A home for half-baked ideas/i,
    );
    await expect(
      page.locator(
        'a[href^="/sign-in"], a[href^="/account"], a[href^="/board"]',
      ),
    ).toHaveCount(0);
  }
});
