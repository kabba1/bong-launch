import { test, expect } from "@playwright/test";

test("GEN-07/08 stale state resets and two tabs serialize their draws", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Give me a highdea", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() =>
    localStorage.setItem(
      "bong:deck:v1",
      '{"schemaVersion":1,"datasetHash":"obsolete"}',
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Give me a highdea", exact: true }),
  ).toBeEnabled();
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("button", { name: "Give me a highdea", exact: true }),
  ).toBeEnabled();
  await Promise.all([
    page
      .getByRole("button", { name: "Give me a highdea", exact: true })
      .click(),
    other
      .getByRole("button", { name: "Give me a highdea", exact: true })
      .click(),
  ]);
  await expect(page.locator("[data-idea-id]")).toBeVisible();
  await expect(other.locator("[data-idea-id]")).toBeVisible();
  expect(
    await page.locator("[data-idea-id]").getAttribute("data-idea-id"),
  ).not.toBe(
    await other.locator("[data-idea-id]").getAttribute("data-idea-id"),
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("bong:deck:v1")!),
  );
  expect(saved.cursor).toBe(2);
  expect(saved.history).toHaveLength(2);
});

test("GEN-10 copy writes the exact supplied text and nothing else", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text: string) => {
          sessionStorage.setItem("test:copied", text);
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Give me a highdea", exact: true })
    .click();
  await page.getByRole("button", { name: "Copy idea", exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("test:copied"))).toBe(
    await page.locator(".idea-text").innerText(),
  );
});

test("GEN-15 canonical text works with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3210/idea/BONG-0001");
  await expect(
    page.getByText("A pizza box needs a corner full of extra toppings.", {
      exact: false,
    }),
  ).toBeVisible();
  await context.close();
});

test("SEC-07/08 injected inline script is blocked and corpus cache policies differ", async ({
  page,
  request,
}) => {
  await page.route("http://127.0.0.1:3210/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "<head>",
      '<head><script>document.documentElement.dataset.attack="executed"</script>',
    );
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Give me a highdea", exact: true }),
  ).toBeEnabled();
  expect(await page.locator("html").getAttribute("data-attack")).toBeNull();
  const manifest = await request.get("/data/manifest.json");
  expect(manifest.headers()["cache-control"]).toBe("no-cache");
  const data = await manifest.json();
  const corpus = await request.get(data.url);
  expect(corpus.headers()["cache-control"]).toContain("immutable");
});
