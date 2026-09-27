import { test, expect } from "@playwright/test";
test("AUTH-13 account navigation reflects the isolated session response", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      json: {
        data: {
          user: { id: "00000000-0000-4000-8000-000000000001" },
          member: null,
        },
        requestId: "navigation-fixture-only",
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Your account", exact: false }),
  ).toHaveAttribute("href", "/account");
});
test("UX-02 mobile navigation supports keyboard focus and Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Through Time", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(nav).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
