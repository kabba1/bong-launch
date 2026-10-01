import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PolicyPage } from "../../src/components/PolicyPage";

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: vi.fn(original.existsSync),
    readFileSync: vi.fn(original.readFileSync),
  };
});

const renderPolicy = (
  slug: "privacy" | "terms" | "accessibility",
  title: string,
) => renderToStaticMarkup(createElement(PolicyPage, { slug, title }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("V1 public policy pages", () => {
  it("publishes the owner-approved notices instead of launch placeholders", () => {
    for (const [slug, title] of [
      ["privacy", "Privacy"],
      ["terms", "Terms"],
      ["accessibility", "Accessibility"],
    ] as const) {
      const html = renderPolicy(slug, title);
      expect(html).not.toContain("awaiting the operator");
      expect(html.match(/<section[ >]/g)?.length ?? 0).toBeGreaterThanOrEqual(
        3,
      );
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

  it("preserves the approved accessibility approach without a shared Contact footer", () => {
    const html = renderPolicy("accessibility", "Accessibility");
    expect(html).toMatch(/keyboard/i);
    expect(html).toMatch(/reduced motion/i);
    expect(html).not.toContain('href="/contact"');
    expect(html).not.toContain("Contact details, when configured");
    expect(html).toMatch(/automated testing.*cannot find every barrier/i);
  });

  it("never reads draft policy files outside development", () => {
    for (const environment of ["production", "test"] as const) {
      vi.stubEnv("NODE_ENV", environment);
      for (const [slug, title] of [
        ["privacy", "Privacy"],
        ["terms", "Terms"],
        ["accessibility", "Accessibility"],
      ] as const) {
        const html = renderPolicy(slug, title);
        expect(html).toContain("Published September 28, 2026");
        expect(html).not.toContain("Draft for review");
        expect(html).not.toContain("1.1-draft");
      }
    }
    for (const call of [
      ...vi.mocked(existsSync).mock.calls,
      ...vi.mocked(readFileSync).mock.calls,
    ]) {
      expect(String(call[0])).not.toContain(
        join("content", "previews", "legal"),
      );
    }
  });

  it("shows plain-language drafts only in development without invented approval", () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const [slug, title] of [
      ["privacy", "Privacy"],
      ["terms", "Terms"],
      ["accessibility", "Accessibility"],
    ] as const) {
      const html = renderPolicy(slug, title);
      expect(html).toContain("Draft for review");
      expect(html).not.toContain("Published");
      expect(html).not.toMatch(
        /public v1|features are disabled|when configured|when one is configured|local preview/i,
      );
      expect(html).not.toContain('href="/contact"');
      const draft = JSON.parse(
        readFileSync(
          join(process.cwd(), "content", "previews", "legal", `${slug}.json`),
          "utf8",
        ),
      );
      expect(draft.approvedBy).toBe("");
      expect(draft.approvedAt).toBe("");
      expect(draft.version).toBe("1.1-draft");
    }
  });

  it("does not use a development draft as a production fallback", () => {
    vi.mocked(existsSync).mockImplementation((path) =>
      String(path).includes(join("content", "previews", "legal")),
    );
    const html = renderPolicy("privacy", "Privacy");
    expect(html).toContain("This policy is not available yet.");
    expect(html).not.toMatch(
      /Draft for review|local preview|registration|participation|disabled/i,
    );
    expect(html).not.toContain("Published");
  });

  it("rejects preview content that claims approval or lacks an explicit draft version", () => {
    vi.stubEnv("NODE_ENV", "development");
    const draft = JSON.parse(
      readFileSync(
        join(process.cwd(), "content", "previews", "legal", "privacy.json"),
        "utf8",
      ),
    );
    for (const override of [
      { approvedBy: "Unverified fixture reviewer" },
      { approvedAt: "2026-09-28" },
      { version: "1.1" },
      { sections: [] },
    ]) {
      vi.mocked(readFileSync).mockReturnValueOnce(
        JSON.stringify({ ...draft, ...override }),
      );
      expect(() => renderPolicy("privacy", "Privacy")).toThrow();
    }
  });
});
