import { test, expect } from "@playwright/test";
// Fixtures are confined to a browser interception; this test makes no persistence claim.
test("BOARD-11 an addressable feed restores its filter and continuation", async ({
  page,
}) => {
  const seen: string[] = [];
  await page.route("**/api/board/posts?*", (route) => {
    seen.push(route.request().url());
    return route.fulfill({
      json: { data: { posts: [], nextCursor: null }, requestId: "test-only" },
    });
  });
  await page.goto("/board?kind=made_this&query=wheel&cursor=YWJj");
  await expect(
    page.getByRole("button", { name: "Made this", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Search published posts")).toHaveValue("wheel");
  await expect.poll(() => seen.length).toBeGreaterThan(0);
  expect(new URL(seen[0]).searchParams.get("cursor")).toBe("YWJj");
  await page.getByRole("button", { name: "All thoughts", exact: true }).click();
  await expect
    .poll(() => new URL(seen.at(-1)!).searchParams.get("kind"))
    .toBe(null);
  expect(new URL(seen.at(-1)!).searchParams.get("cursor")).toBe(null);
});
