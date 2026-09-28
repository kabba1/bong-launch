import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Community from "../../src/app/community/page";

const configured = vi.hoisted(() => ({
  socials: {} as { x?: string; telegram?: string },
}));
vi.mock("@/lib/site", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/site")>()),
  publicSettings: configured,
}));

// Render fixtures only: these links never enter the production site settings.
const x = "https://social.invalid/x-fixture";
const telegram = "https://social.invalid/telegram-fixture";
const render = () => renderToStaticMarkup(createElement(Community));

describe("V1-04 configured community social links", () => {
  beforeEach(() => {
    configured.socials = {};
  });

  it("does not invent social accounts or signup when no links are configured", () => {
    const html = render();
    expect(html).toContain("Coming soon.");
    expect(html).toContain("Official links will appear here");
    expect(html).not.toContain("Follow on X");
    expect(html).not.toContain("Join Telegram");
    expect(html).not.toMatch(/href="\/(sign-in|account|board)/);
  });

  it("renders both configured links with safe external-link attributes", () => {
    configured.socials = { x, telegram };
    const html = render();
    expect(html).toContain(`href="${x}"`);
    expect(html).toContain(`href="${telegram}"`);
    expect(html).toContain("Find BONG here in the meantime.");
    expect(html).toContain("Follow on X");
    expect(html).toContain("Join Telegram");
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).not.toContain("Official links will appear here");
  });

  it("renders either configured channel independently", () => {
    configured.socials = { telegram };
    const html = render();
    expect(html).toContain("Join Telegram");
    expect(html).not.toContain("Follow on X");
  });

  it("omits unsafe or credential-bearing links even when rendering isolated configuration", () => {
    configured.socials = {
      x: "javascript:alert(1)",
      telegram: "https://user:password@social.invalid/",
    };
    const html = render();
    expect(html).not.toContain("Follow on X");
    expect(html).not.toContain("Join Telegram");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("user:password");
  });
});
