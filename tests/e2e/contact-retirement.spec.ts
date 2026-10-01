import { test, expect } from "@playwright/test";

test("retired Contact URL redirects and is absent from public navigation and sitemap", async ({
  page,
  request,
}) => {
  const response = await request.get("/contact", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/community");
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Contact", exact: true }),
  ).toHaveCount(0);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/contact");
});
