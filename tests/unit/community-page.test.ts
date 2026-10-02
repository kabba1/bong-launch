import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Community from "../../src/app/community/page";
import About from "../../src/app/about/page";
import Contact from "../../src/app/contact/page";

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
  contacts: {} as { support?: string; security?: string },
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
const communityCopy = "Share an idea. Show what you made.";

beforeEach(() => {
  configured.socials = {};
  configured.tokenStatus = "not_launched";
  configured.token = null;
  configured.contacts = {};
});

describe("V1-04 configured community social links", () => {
  it("does not invent social accounts or signup when no links are configured", () => {
    const html = render();
    expect(html).toContain(communityCopy);
    expect(html).toContain("Forum coming soon");
    expect(html).not.toContain("Already here");
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
    expect(html).toContain("Already here");
    expect(html).toContain("Find BONG on X and Telegram.");
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html.match(/<a[ >]/g)).toHaveLength(2);
  });

  it("renders either configured channel independently", () => {
    configured.socials = { telegram };
    const html = render();
    expect(html).toContain("Join Telegram");
    expect(html).not.toContain("Follow on X");
    expect(html).toContain("Find BONG on Telegram.");
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

  it("shows the supplied artwork as decoration without unrelated destinations", () => {
    const html = render();
    const artwork = html.match(
      /<div class="community-art" aria-hidden="true">(<img[^>]+>)<\/div>/,
    )?.[1];
    expect(html.match(/<img[ >]/g)).toHaveLength(1);
    expect(artwork).toContain('src="/images/bong-800.webp?');
    expect(artwork).toContain('alt=""');
    expect(artwork).toContain('width="1254"');
    expect(artwork).toContain('height="1254"');
    expect(html).not.toMatch(/<figcaption[ >]/);
    expect(html).not.toMatch(/href="\/(?:through-time)?"/);
    expect(html).not.toMatch(/Get an idea|highdea|The usual suspect/i);
  });
});

describe("About BONG lore and state-dependent token details", () => {
  it("uses the requested story, generator and sourced timeline paragraphs", () => {
    const html = renderAbout();
    const text = html.replace(/<[^>]*>/g, "");
    for (const paragraph of [
      "BONG has always been around.",
      "The pyramids? BONG. The wheel? BONG. Relativity? BONG. Tinder? BONG, but that one might have been a mistake.",
      "Click the bong and see what comes to mind.",
      "Some ideas made history. Explore the moments that changed how people lived, the problems they were trying to solve, and what happened next.",
      "The forum is coming later. Share an idea or show what you’ve made.",
    ])
      expect(text).toContain(paragraph);
    expect(html).not.toMatch(/\bhighdeas?\b/i);
    expect(html).not.toMatch(/href="\/(sign-in|account|board)/);
  });

  it("keeps the requested opening story without the removed fiction label", () => {
    const html = renderAbout();
    const opening = html.match(
      /<section class="story-section story-opening"[^>]*>(.*?)<\/section>/,
    );
    expect(opening?.[1]).toContain("BONG has always been around.");
    expect(opening?.[1]).not.toContain("BONG’s version");
    expect(opening?.[1]).not.toContain("$BONG");
    expect(html).not.toContain("story-lore");
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
    expect(html).toContain(
      "Memecoins are speculative and can lose all their value.",
    );
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

describe("Retired Contact route", () => {
  it("permanently redirects old links to Community without rendering a contact section", () => {
    expect(() => Contact()).toThrowError(
      expect.objectContaining({
        digest: "NEXT_REDIRECT;replace;/community;308;",
      }),
    );
  });
});
