import { test, expect } from "@playwright/test";
test("GEN-04/05/13 generation persists without a history UI and rapid clicks use one entry", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Give me an idea",
    exact: true,
  });
  await expect(button).toBeEnabled();
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await button.click();
  await expect(page.locator("[data-idea-id]")).toBeVisible();
  const first = await page
    .locator("[data-idea-id]")
    .getAttribute("data-idea-id");
  await expect(
    page
      .locator(".generator-actions")
      .getByRole("button", { name: "Another idea", exact: true }),
  ).toBeEnabled();
  await page
    .locator(".generator-actions")
    .getByRole("button", { name: "Another idea", exact: true })
    .evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
      b.click();
    });
  await expect(page.locator("[data-idea-id]")).not.toHaveAttribute(
    "data-idea-id",
    first!,
  );
  const second = await page
    .locator("[data-idea-id]")
    .getAttribute("data-idea-id");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("bong:deck:v1")!),
  );
  expect(saved.cursor).toBe(2);
  expect(saved.history).toEqual([first, second]);
  await expect(page.getByText("Recent ideas", { exact: true })).toHaveCount(0);
  expect(requests.filter((u) => u.includes("/api/"))).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Give me an idea", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".generator-card")).toHaveCount(0);
  await expect(page.getByText("Recent ideas", { exact: true })).toHaveCount(0);
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("bong:deck:v1")!),
  );
  expect(restored.cursor).toBe(2);
  expect(restored.history).toEqual([first, second]);
  await page
    .getByRole("button", { name: "Give me an idea", exact: true })
    .click();
  await expect(page.locator("[data-idea-id]")).toBeVisible();
  const third = await page
    .locator("[data-idea-id]")
    .getAttribute("data-idea-id");
  expect([first, second]).not.toContain(third);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("bong:deck:v1")!).cursor,
    ),
  ).toBe(3);
});
test("GEN-15 DATA-08 canonical ideas have server text and unknown IDs 404", async ({
  request,
}) => {
  const page = await request.get("/idea/BONG-0001");
  expect(page.status()).toBe(200);
  expect(await page.text()).toContain(
    "A pizza box needs a corner full of extra toppings.",
  );
  expect((await request.get("/idea/BONG-9999")).status()).toBe(404);
});
