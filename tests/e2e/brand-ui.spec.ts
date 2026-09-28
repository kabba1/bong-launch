import { test, expect } from "@playwright/test";

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
      name: "Give me a highdea from the bong",
      exact: true,
    });
    await expect(artwork).toHaveCount(1);
    await expect(artwork).toBeEnabled();
    await artwork.click();
    const result = page.locator("[data-idea-id]");
    await expect(result).toBeVisible();
    const first = await result.getAttribute("data-idea-id");
    const primary = page.locator(".generator-actions").getByRole("button", {
      name: "Another one",
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
    const another = page.locator(".result-tools").getByRole("button", {
      name: "Another one",
      exact: true,
    });
    await expect(another).toBeEnabled();
    await another.click();
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
      page.locator('.generator-card [aria-live="polite"]'),
    ).toHaveAttribute("aria-atomic", "true");
    expect(privateRequests).toEqual([]);
  });

test("@public-v1 exact homepage copy keeps the generator and destinations clear", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Give me a highdea", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".hero-intro")).toHaveText(
    "Click the bong for a highdea.",
  );
  await expect(page.locator(".generator-card")).toContainText(
    "Your next highdea",
  );
  await expect(page.locator(".generator-card")).toContainText(
    /BONG hasn['’]t said anything yet\./,
  );
  await expect(page.locator(".hero")).not.toContainText(
    /AI-origin|AI-powered|innovation platform|ecosystem|unlock your potential/i,
  );
  await expect(page.locator(".ticker-strip")).toHaveText(
    "Curiosity welcome. Genius optional.",
  );
  await expect(
    page.getByText("Curiosity welcome. Genius optional.", { exact: true }),
  ).toHaveCount(1);
  const destinations = page.locator(".thought-destination");
  await expect(destinations).toHaveCount(2);
  await expect(destinations.nth(0).getByRole("heading")).toHaveText(
    "Bong Through Time",
  );
  await expect(destinations.nth(0).locator("p")).toHaveText(
    "The stories behind inventions and discoveries, with BONG taking the credit.",
  );
  await expect(
    destinations
      .nth(0)
      .getByRole("link", { name: "Visit Through Time", exact: true }),
  ).toHaveAttribute("href", "/through-time");
  await expect(destinations.nth(1).getByRole("heading")).toHaveText(
    "Community",
  );
  await expect(
    destinations.nth(1).getByText("Coming soon", { exact: true }),
  ).toBeVisible();
  await expect(
    destinations
      .nth(1)
      .getByText("A place to share ideas and things you’ve made.", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(
    destinations
      .nth(1)
      .getByRole("link", { name: "About the community", exact: true }),
  ).toHaveAttribute("href", "/community");
});

test("@public-v1 public copy and metadata omit quantity claims and repeated slogans", async ({
  page,
}) => {
  const pages = [
    [
      "/",
      "Click the bong for a highdea. Explore Bong Through Time and find the BONG community.",
    ],
    [
      "/through-time",
      "The history of inventions and discoveries, alongside BONG’s fictional version of events.",
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
    ).toHaveCount(route === "/" ? 1 : 0);
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
