import { test, expect } from "@playwright/test";
test("GEN-04/05/12/13 generation persists, history does not draw, and rapid clicks use one entry", async ({
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
    page.getByRole("button", { name: "Another idea", exact: true }),
  ).toBeEnabled();
  await page
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
  await page.getByText("Recent ideas", { exact: true }).click();
  await expect(page.locator(".recent-ideas button")).toHaveCount(2);
  await page.locator(".recent-ideas button").last().click();
  await expect(page.locator("[data-idea-id]")).toHaveAttribute(
    "data-idea-id",
    first!,
  );
  expect(requests.filter((u) => u.includes("/api/"))).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Give me an idea", exact: true }),
  ).toBeEnabled();
  await page.getByText("Recent ideas", { exact: true }).click();
  await expect(page.locator(".recent-ideas button")).toHaveCount(2);
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
test("SEC-07/08 fresh nonces and no shared HTML cache", async ({ request }) => {
  const a = await request.get("/");
  const b = await request.get("/");
  const csp = a.headers()["content-security-policy"];
  expect(csp).toContain("nonce-");
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).not.toEqual(b.headers()["content-security-policy"]);
  expect(a.headers()["cache-control"]).toContain("no-store");
});
