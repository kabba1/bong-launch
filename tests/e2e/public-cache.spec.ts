import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const publicPages = [
  "/",
  "/about",
  "/community",
  "/through-time",
  "/privacy",
  "/terms",
  "/accessibility",
  "/contact",
  "/community-rules",
];

test("@public-v1 SEC-07 public hydration and styles work under the static CSP", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Content Security Policy/i.test(message.text())
    )
      violations.push(message.text());
  });
  for (const path of [...publicPages, "/idea/BONG-0001", "/missing-page"])
    await page.goto(path);
  expect(violations).toEqual([]);
});

test("@public-v1 SEC-07/08/16 public HTML is cacheable with static security headers and noindex", async ({
  request,
}) => {
  for (const path of [...publicPages, "/idea/BONG-0001", "/idea/BONG-1000"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const headers = response.headers();
    expect(headers["cache-control"], path).not.toContain("no-store");
    expect(headers["cache-control"], path).not.toContain("private");
    expect(headers["set-cookie"], path).toBeUndefined();
    expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    const csp = headers["content-security-policy"];
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'none'",
    ])
      expect(csp).toContain(directive);
    expect(csp).not.toMatch(/nonce-|unsafe-eval|https?:|\*/);
  }
});

test("@public-v1 DATA-08 GEN-15 public pages and all 1000 idea pages and OG images are built statically", async ({
  request,
}) => {
  const manifest = JSON.parse(
    readFileSync(".next/prerender-manifest.json", "utf8"),
  );
  for (const path of publicPages)
    expect(manifest.routes[path], path).toBeDefined();
  for (let index = 1; index <= 1000; index += 1) {
    const path = `/idea/BONG-${String(index).padStart(4, "0")}`;
    expect(manifest.routes[path], path).toBeDefined();
    expect(manifest.routes[`${path}/opengraph-image`], path).toBeDefined();
  }
  for (const route of [
    "/idea/[ideaId]",
    "/idea/[ideaId]/opengraph-image",
    "/through-time/[slug]",
  ])
    expect(manifest.dynamicRoutes[route]?.fallback, route).toBe(false);
  expect((await request.get("/idea/BONG-9999/opengraph-image")).status()).toBe(
    404,
  );
  expect((await request.get("/through-time/unpublished-draft")).status()).toBe(
    404,
  );
  const image = await request.get("/idea/BONG-0001/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  expect(image.headers()["cache-control"]).not.toContain("no-store");
});

test("@public-v1 SEC-08 framework assets remain immutable and public CSP does not vary between requests", async ({
  request,
}) => {
  const first = await request.get("/");
  const second = await request.get("/");
  expect(first.headers()["content-security-policy"]).toBe(
    second.headers()["content-security-policy"],
  );
  const html = await first.text();
  const script = html.match(/src="([^\"]*\/_next\/static\/[^\"]+\.js)"/);
  expect(script).not.toBeNull();
  const response = await request.get(script![1]);
  expect(response.headers()["cache-control"]).toContain("immutable");
});
