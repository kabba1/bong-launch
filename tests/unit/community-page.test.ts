import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Community from "../../src/app/community/page";
import About from "../../src/app/about/page";

type TokenFixture = {
  address: string;
  network: string;
  url: string;
  disclosure: string;
};

const configured = vi.hoisted(() => ({
  socials: {} as { x?: string; telegram?: string },
  tokenStatus: "not_launched" as "not_launched" | "live",
  token: null as TokenFixture | null,
}));
vi.mock("@/lib/site", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/site")>()),
  publicSettings: configured,
}));
vi.mock("@/lib/launch-scope", () => ({ communityEnabled: () => false }));

// Render fixtures only: these links never enter the production site settings.
const x = "https://social.invalid/x-fixture";
const telegram = "https://social.invalid/telegram-fixture";
const render = () => renderToStaticMarkup(createElement(Community));
const renderAbout = () => renderToStaticMarkup(createElement(About));
const communityCopy =
  "A place to share ideas, projects, and the things you make.";

beforeEach(() => {
  configured.socials = {};
  configured.tokenStatus = "not_launched";
  configured.token = null;
});

describe("V1-04 configured community social links", () => {
  it("does not invent social accounts or signup when no links are configured", () => {
    const html = render();
    expect(html).toContain("Coming soon.");
    expect(html).toContain(communityCopy);
    expect(html.match(/<p[ >]/g)).toHaveLength(1);
    expect(html).not.toContain("Follow on X");
    expect(html).not.toContain("Join Telegram");
    expect(html).not.toMatch(/href="\/(sign-in|account|board)/);
    expect(html).not.toMatch(/href="#"/);
  });

  it("renders both configured links with safe external-link attributes", () => {
    configured.socials = { x, telegram };
    const html = render();
    expect(html).toContain(`href="${x}"`);
    expect(html).toContain(`href="${telegram}"`);
    expect(html).toContain(communityCopy);
    expect(html).toContain("Follow on X");
    expect(html).toContain("Join Telegram");
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html.match(/<p[ >]/g)).toHaveLength(1);
    expect(html.match(/<a[ >]/g)).toHaveLength(2);
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

  it("removes the artwork and unrelated destinations from the Community teaser", () => {
    const html = render();
    expect(html).not.toMatch(/<img[ >]|<figure[ >]|<figcaption[ >]/);
    expect(html).not.toMatch(/href="\/(?:through-time)?"/);
    expect(html).not.toMatch(/Get an idea|highdea|The usual suspect/i);
  });
});

describe("About approved public copy and state-dependent token details", () => {
  it("uses the approved story, generator and timeline paragraphs", () => {
    const html = renderAbout();
    for (const paragraph of [
      "Every good idea, bad idea, and completely unhinged idea has a beginning. BONG likes to think it was somewhere nearby.",
      "This project is about the spark that sends your imagination somewhere unexpected—and what happens when you follow it.",
      "Press the button and BONG will give you an idea. Use it, ignore it, or see where it goes.",
      "A timeline of ideas and inventions, and the stories of how they came to be.",
    ])
      expect(html).toContain(paragraph);
    expect(html).not.toMatch(/\bhighdeas?\b/i);
    expect(html).not.toMatch(/href="\/(sign-in|account|board)/);
  });

  it("integrates the origin story without the old historical-credit box", () => {
    const html = renderAbout();
    expect(html).not.toMatch(
      /story-lore|BONG’s version · Fiction|The pyramids\?|Relativity\?|The moon landing\?/,
    );
  });

  it("shows the approved prelaunch state without claiming the token cannot exist", () => {
    const html = renderAbout();
    expect(html).toContain("$BONG is coming soon.");
    expect(html).toMatch(
      /no official contract(?: address)? (?:has been|is) published/i,
    );
    expect(html).toMatch(
      /(?:be careful|beware)[^<]*(?:accounts|tokens)[^<]*same name/i,
    );
    expect(html).toMatch(
      /official links[^<]*(?:will appear|will be (?:published|posted|shared))[^<]*(?:here|this site)/i,
    );
    expect(html).not.toMatch(/token (?:does not|doesn’t) exist/i);
    expect(html).not.toMatch(
      /speculative|lose all their value|connect to your wallet|process token purchases/i,
    );
    expect(html).not.toContain("Owner-verified contract:");
    expect(html).not.toContain("Copy full address");
  });

  it("preserves verified live identifiers, disclosure and safe official-link attributes", () => {
    configured.tokenStatus = "live";
    configured.token = {
      address: "test-only-complete-address-12345",
      network: "Isolated test network",
      url: "https://token.invalid/verified-fixture",
      disclosure: "Isolated creator disclosure; never production content.",
    };
    const html = renderAbout();
    for (const value of Object.values(configured.token))
      expect(html).toContain(value);
    expect(html).toContain("Copy full address");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Memecoins are speculative and can lose all their value.");
    expect(html).toContain(
      "This site does not connect to your wallet or process token purchases.",
    );
    expect(html).not.toContain("$BONG is coming soon.");
    expect(html).not.toMatch(
      /no official contract(?: address)? (?:has been|is) published/i,
    );
  });

  it("never turns an invalid token URL into an official destination", () => {
    configured.tokenStatus = "live";
    configured.token = {
      address: "test-only-complete-address-12345",
      network: "Isolated test network",
      url: "https://user:password@token.invalid/",
      disclosure: "Isolated test disclosure.",
    };
    const html = renderAbout();
    expect(html).not.toContain("user:password");
    expect(html).not.toContain("Copy full address");
    expect(html).not.toContain("Official token page");
  });
});
