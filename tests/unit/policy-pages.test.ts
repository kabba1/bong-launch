import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicyPage } from "../../src/components/PolicyPage";

const renderPolicy = (
  slug: "privacy" | "terms" | "accessibility",
  title: string,
) => renderToStaticMarkup(createElement(PolicyPage, { slug, title }));

describe("V1 public policy pages", () => {
  it("publishes the owner-approved notices instead of launch placeholders", () => {
    for (const [slug, title] of [
      ["privacy", "Privacy"],
      ["terms", "Terms"],
      ["accessibility", "Accessibility"],
    ] as const) {
      const html = renderPolicy(slug, title);
      expect(html).not.toContain("awaiting the operator");
      expect(html.match(/<section>/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(html).toContain("Published September 28, 2026");
    }
  });

  it("explains the public v1 privacy boundary", () => {
    const html = renderPolicy("privacy", "Privacy");
    expect(html).toMatch(/browser.*storage/i);
    expect(html).toMatch(/hosting provider.*logs/i);
    expect(html).toMatch(/does not require an account/i);
    expect(html).toContain("X and Telegram");
  });

  it("sets concise terms for ideas, history, and future token links", () => {
    const html = renderPolicy("terms", "Terms");
    expect(html).toMatch(/entertainment and inspiration/i);
    expect(html).toMatch(/fiction.*history/i);
    expect(html).toMatch(/no official contract address/i);
    expect(html).toMatch(/not financial or investment advice/i);
  });

  it("states the accessibility approach and feedback path", () => {
    const html = renderPolicy("accessibility", "Accessibility");
    expect(html).toMatch(/keyboard/i);
    expect(html).toMatch(/reduced motion/i);
    expect(html).toContain('href="/contact"');
    expect(html).toMatch(/automated testing.*cannot find every barrier/i);
  });
});
