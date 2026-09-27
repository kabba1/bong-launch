import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const routes = [
  "/",
  "/idea/BONG-0001",
  "/through-time",
  "/community",
  "/about",
  ...(process.env.COMMUNITY_ENABLED === "true"
    ? [
        "/board",
        "/board/new",
        "/sign-in",
        "/onboarding",
        "/account",
        "/account/security",
        "/account/data",
        "/moderation",
      ]
    : []),
  "/privacy",
  "/terms",
  "/community-rules",
  "/contact",
  "/accessibility",
];
for (const route of routes)
  test(`UX-04 ${route} has no axe violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations,
      `${route}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  });
