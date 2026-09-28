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
        .getByRole("button", { name: "Give me a highdea", exact: true })
        .click();
      await expect(page.locator("[data-idea-id]")).toBeVisible();
      await expect(page.locator(".result-tools a[href^='/board']")).toHaveCount(
        0,
      );
      await expect(
        page
          .locator(".result-tools")
          .getByRole("button", { name: "Another one", exact: true }),
      ).toBeVisible();
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
    page.getByRole("heading", { name: "Community. Coming soon.", exact: true }),
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
      expect(response.headers()["set-cookie"]).toBeUndefined();
    }
  }
});

test("@public-v1 V1-04 Coming Soon exposes only configured official social links", async ({
  page,
}) => {
  await page.goto("/community");
  const socials = settings.socials as { x?: string; telegram?: string };
  for (const [key, label] of [
    ["x", "Follow on X"],
    ["telegram", "Join Telegram"],
  ] as const) {
    const link = page.getByRole("link", { name: label, exact: false });
    if (socials[key]) {
      await expect(link).toHaveAttribute("href", new URL(socials[key]).href);
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    } else await expect(link).toHaveCount(0);
  }
  await expect(
    page.getByRole("link", { name: "Get a highdea", exact: true }),
  ).toHaveAttribute("href", "/");
  await expect(
    page.getByText(
      "A place to post an idea, show something you made, or talk about someone else’s.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      socials.x || socials.telegram
        ? "Find BONG here in the meantime."
        : "Official links will appear here when they’re ready.",
      { exact: true },
    ),
  ).toBeVisible();
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
  const empty = page.getByRole("heading", {
    name: "The first stories are on their way.",
    exact: true,
  });
  await expect(empty).toBeVisible();
  await expect(
    page.getByText(
      "The history of inventions and discoveries, with BONG’s fictional version on the side.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page
      .locator(".time-empty")
      .getByRole("link", { name: "Get a highdea", exact: true }),
  ).toHaveAttribute("href", "/");
  await expect(page.locator(".time-empty p")).toHaveCount(0);
  await page.goto("/through-time?q=curiosity");
  await expect(empty).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search history" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Reset", exact: true }),
  ).toHaveCount(0);
  await page.goto("/about#bong-token");
  await expect(
    page.getByRole("heading", { name: "$BONG", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The generator picks from a fixed collection of AI-generated ideas that were edited before being added.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Memecoins are speculative and can lose all their value.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This site does not connect to your wallet or process token purchases.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("BONG’s version · Fiction", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(privateLink)).toHaveCount(0);
});
