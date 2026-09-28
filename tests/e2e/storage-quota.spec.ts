import { test, expect } from "@playwright/test";
test("GEN-06 quota failure with a coarse clock never rewinds the in-memory deck", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await expect(page.locator("[data-idea-id]")).toBeVisible();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("bong:deck:v1")!);
    Date.now = () => saved.updatedAt;
    Storage.prototype.setItem = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  const another = page.locator(".generator-actions").getByRole("button", {
    name: "Another idea",
    exact: true,
  });
  await another.click();
  const second = await page
    .locator("[data-idea-id]")
    .getAttribute("data-idea-id");
  await another.click();
  await expect(page.locator("[data-idea-id]")).not.toHaveAttribute(
    "data-idea-id",
    second!,
  );
});
