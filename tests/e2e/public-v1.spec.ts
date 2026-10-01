import { test, expect } from "@playwright/test";
import settings from "../../content/site.json" with { type: "json" };

const publicRoutes = [
  "/",
  "/idea/BONG-0001",
  "/through-time",
  "/about",
  "/community",
  "/privacy",
  "/terms",
  "/contact",
  "/accessibility",
];
const privateLink =
  'a[href^="/board"], a[href^="/sign-in"], a[href^="/onboarding"], a[href^="/account"], a[href^="/moderation"], a[href^="/admin"], a[href^="/members"]';

test("@public-v1 V1-01 public pages operate without account links or provider requests", async ({
  page,
}) => {
  const disallowed: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/api/") ||
      url.origin !== "http://127.0.0.1:3210"
    )
      disallowed.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of publicRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator(privateLink)).toHaveCount(0);
    if (route === "/") {
      await page
        .getByRole("button", { name: "Give me an idea", exact: true })
        .click();
      await expect(page.locator("[data-idea-id]")).toBeVisible();
      await expect(page.locator(".result-tools a[href^='/board']")).toHaveCount(
        0,
      );
      await expect(
        page
          .locator(".generator-actions")
          .getByRole("button", { name: "Another idea", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(".result-tools").getByRole("button"),
      ).toHaveText(["Copy idea", "Share"]);
    }
  }
  expect(disallowed).toEqual([]);
  expect(errors).toEqual([]);
});

test("@public-v1 V1-02 private direct links lead to Coming Soon without carrying private parameters", async ({
  page,
  request,
}) => {
  const routes = [
    "/board",
    "/board/new?sourceIdeaId=BONG-0001",
    "/board/private-id/edit",
    "/sign-in?returnTo=%2Faccount",
    "/onboarding",
    "/account",
    "/account/security",
    "/account/data",
    "/moderation",
    "/admin",
    "/members/someone",
  ];
  for (const route of routes) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(307);
    expect(response.headers()["cache-control"], route).toContain("no-store");
    expect(response.headers()["x-robots-tag"], route).toBe("noindex, nofollow");
    expect(response.headers()["x-frame-options"], route).toBe("DENY");
    expect(response.headers()["x-content-type-options"], route).toBe("nosniff");
    expect(response.headers()["referrer-policy"], route).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers()["permissions-policy"], route).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    expect(
      new URL(response.headers().location, "http://127.0.0.1:3210").pathname,
    ).toBe("/community");
    expect(
      new URL(response.headers().location, "http://127.0.0.1:3210").search,
    ).toBe("");
  }
  await page.goto("/board/new?sourceIdeaId=BONG-0001");
  await expect(page).toHaveURL("http://127.0.0.1:3210/community");
  await expect(
    page.getByRole("heading", { name: "Community.", exact: true }),
  ).toBeVisible();
  await expect(page.locator("input, textarea")).toHaveCount(0);
});

test("@public-v1 V1-03 community API reads and writes are disabled before provider access", async ({
  request,
}) => {
  for (const path of [
    "/api/session",
    "/api/security/csrf",
    "/api/auth/request-code",
    "/api/auth/verify-code",
    "/api/board/posts",
    "/api/uploads",
    "/api/media/some-asset/main",
    "/api/account/export",
    "/api/moderation/queue",
  ]) {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const response = await request.fetch(path, {
        method,
        headers: { Origin: "https://untrusted.invalid" },
      });
      expect(response.status(), `${method} ${path}`).toBe(404);
      expect((await response.json()).error.code).toBe("COMMUNITY_DISABLED");
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      expect(response.headers()["x-frame-options"]).toBe("DENY");
      expect(response.headers()["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(response.headers()["set-cookie"]).toBeUndefined();
    }
  }
});

test("@public-v1 V1-04 Coming Soon exposes only configured official social links", async ({
  page,
}) => {
  await page.goto("/community");
  const main = page.locator("main");
  const socials = settings.socials as { x?: string; telegram?: string };
  for (const [key, label] of [
    ["x", "Follow on X"],
    ["telegram", "Join Telegram"],
  ] as const) {
    const link = main.getByRole("link", { name: label, exact: false });
    if (socials[key]) {
      await expect(link).toHaveAttribute("href", new URL(socials[key]).href);
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    } else await expect(link).toHaveCount(0);
  }
  await expect(
    main.getByRole("heading", { name: "Community.", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText("Share an idea. Show what you made.", { exact: true }),
  ).toBeVisible();
  await expect(main.getByText("Forum coming soon", { exact: true })).toBeVisible();
  if (socials.x || socials.telegram) {
    await expect(main.getByRole("heading", { name: "Already here" })).toBeVisible();
    const channels = socials.x && socials.telegram ? "X and Telegram" : socials.x ? "X" : "Telegram";
    await expect(main.getByText(`Find BONG on ${channels}.`, { exact: true })).toBeVisible();
  }
  await expect(main.locator("img, figure, figcaption")).toHaveCount(0);
  await expect(
    main.locator('a[href="/"], a[href="/through-time"]'),
  ).toHaveCount(0);
  await expect(main.getByRole("link")).toHaveCount(
    Number(!!socials.x) + Number(!!socials.telegram),
  );
  await expect(main).not.toContainText(
    /highdea|Get an idea|The usual suspect/i,
  );
  await expect(page.locator(privateLink)).toHaveCount(0);
});

test("@public-v1 V1-05 a small timeline omits search and token information remains available", async ({
  page,
}) => {
  await page.goto("/through-time");
  await expect(
    page.getByRole("textbox", { name: "Search history" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".time-empty")).toContainText("Coming soon.");
  await expect(page.locator(".chronology")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Some ideas made history.");
  await page.goto("/through-time?q=curiosity");
  await expect(page.locator(".time-empty")).toContainText("Coming soon.");
  await expect(
    page.getByRole("textbox", { name: "Search history" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Reset", exact: true }),
  ).toHaveCount(0);
});

test("@public-v1 About retains the requested lore and state-dependent token copy", async ({
  page,
}) => {
  await page.goto("/about#bong-token");
  await expect(
    page.getByRole("heading", { name: "$BONG", exact: true }),
  ).toBeVisible();
  for (const paragraph of [
    "BONG has always been around.",
    "The pyramids? BONG. The wheel? BONG. Relativity? BONG. Tinder? BONG, but that one might have been a mistake.",
    "Click the bong and see what comes to mind.",
    "Some ideas made history. Explore the moments that changed how people lived, the problems they were trying to solve, and what happened next.",
    "The forum is coming later. Share an idea or show what you’ve made.",
  ])
    await expect(page.getByText(paragraph, { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/\bhighdeas?\b/i);
  await expect(
    page.getByRole("heading", { name: "Community", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".story-opening")).not.toContainText("$BONG");
  await expect(page.locator(".story-opening")).not.toContainText("BONG’s version");
  const token = settings.token as null | {
    network: string;
    address: string;
    disclosure: string;
    url: string;
  };
  const section = page.locator("#bong-token");
  if (settings.tokenStatus === "live" && token) {
    await expect(section).toContainText(token.network);
    await expect(section).toContainText(token.address);
    await expect(section).toContainText(token.disclosure);
    await expect(
      section.getByRole("button", { name: "Copy full address" }),
    ).toBeVisible();
    await expect(
      section.getByRole("link", { name: /Official token page/ }),
    ).toHaveAttribute("href", token.url);
    await expect(
      section.getByRole("link", { name: /Official token page/ }),
    ).toHaveAttribute("rel", "noopener noreferrer");
    await expect(section).not.toContainText("$BONG is coming soon.");
  } else {
    await expect(
      section.getByText("$BONG is coming soon.", { exact: true }),
    ).toBeVisible();
    await expect(section).toContainText(
      /no official contract(?: address)? (?:has been|is) published/i,
    );
    await expect(section).toContainText(
      /(?:be careful|beware)[^.]*(?:accounts|tokens)[^.]*same name/i,
    );
    await expect(section).toContainText(
      /official links[^.]*(?:will appear|will be (?:published|posted|shared))[^.]*(?:here|this site)/i,
    );
    await expect(section).not.toContainText(
      /token (?:does not|doesn’t) exist|speculative|lose all their value|connect to your wallet|process token purchases/i,
    );
  }
  await expect(page.locator(privateLink)).toHaveCount(0);
});
