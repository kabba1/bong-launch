import { describe, expect, it } from "vitest";
import {
  assertBrowserMutation,
  readBytes,
  safeReturnTo,
} from "../../src/server/security/boundary";
import {
  postInput,
  profileInput,
  projectUrl,
  onboardingInput,
  email,
} from "../../src/server/security/schemas";

describe("SEC-02/03/04 request boundary", () => {
  const request = (origin?: string, extra: Record<string, string> = {}) =>
    new Request("https://bong.example/api/board/posts", {
      method: "POST",
      headers: {
        "x-bong-request": "1",
        ...(origin ? { origin } : {}),
        ...extra,
      },
    });
  it("denies missing, null, deceptive subdomain, and cross-site origins", () => {
    for (const origin of [
      undefined,
      "null",
      "https://bong.example.evil.test",
      "https://evil.test",
    ])
      expect(() =>
        assertBrowserMutation(request(origin), ["https://bong.example"]),
      ).toThrow();
    expect(() =>
      assertBrowserMutation(
        request("https://bong.example", { "sec-fetch-site": "cross-site" }),
        ["https://bong.example"],
      ),
    ).toThrow();
    expect(() =>
      assertBrowserMutation(request("https://bong.example"), [
        "https://bong.example",
      ]),
    ).not.toThrow();
  });
  it("rejects streamed bytes beyond cap even when declared size lies", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(3));
        c.enqueue(new Uint8Array(3));
        c.close();
      },
    });
    const req = new Request("https://bong.example", {
      method: "POST",
      headers: { "content-length": "1" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readBytes(req, 5)).rejects.toMatchObject({ status: 413 });
  });
  it("accepts exact capped stream and rejects oversized declaration before reading", async () => {
    expect(
      (
        await readBytes(
          new Request("https://bong.example", {
            method: "POST",
            body: "12345",
          }),
          5,
        )
      ).byteLength,
    ).toBe(5);
    await expect(
      readBytes(
        new Request("https://bong.example", {
          method: "POST",
          headers: { "content-length": "6" },
          body: "1",
        }),
        5,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("prevents open redirects and retains only supported composer state", () => {
    for (const input of [
      "//evil.test",
      "https://evil.test",
      "/\\evil.test",
      "/%252f%252fevil.test",
      "/account?next=https://evil.test",
      "/admin/audit",
      "/account\n",
    ])
      expect(safeReturnTo(input, "https://bong.example")).toBe("/account");
    expect(
      safeReturnTo(
        "/board/new?sourceIdeaId=BONG-0042&next=evil",
        "https://bong.example",
      ),
    ).toBe("/board/new?sourceIdeaId=BONG-0042");
    expect(safeReturnTo("/board", "https://bong.example")).toBe("/board");
  });
});

describe("SEC-01/09 strict user input", () => {
  const post = {
    kind: "hear_me_out",
    title: "A useful thought",
    body: "This thought is long enough to explain.",
    assets: [],
    idempotencyKey: "bc87b3d3-71f1-46cf-b766-e333201ec20b",
  };
  it("uses Supabase email case normalization without inventing provider-specific aliases", () => {
    expect(email.parse("Some.One+Tag@Example.ORG")).toBe(
      "some.one+tag@example.org",
    );
  });
  it("rejects client privilege, unknown nested fields and HTML execution URLs", () => {
    for (const field of [
      "authorId",
      "role",
      "trustedText",
      "publishedAt",
      "__proto__",
    ])
      expect(
        postInput.safeParse(
          JSON.parse(JSON.stringify({ ...post, [field]: "admin" })),
        ).success,
      ).toBe(false);
    expect(
      postInput.safeParse({
        ...post,
        assets: [
          {
            id: "bc87b3d3-71f1-46cf-b766-e333201ec20b",
            altText: "A descriptive text",
            storageKey: "evil",
          },
        ],
      }).success,
    ).toBe(false);
    for (const url of [
      "javascript:alert(1)",
      "http://example.org",
      "https://user:pass@example.org",
      "https://example.org/\n",
    ])
      expect(projectUrl.safeParse(url).success).toBe(false);
    expect(projectUrl.safeParse("https://example.org/project").success).toBe(
      true,
    );
  });
  it("counts Unicode code points and keeps paragraphs as text", () => {
    expect(
      postInput.parse({ ...post, title: "😀".repeat(100) }).title,
    ).toHaveLength(200);
    expect(
      postInput.safeParse({ ...post, title: "😀".repeat(101) }).success,
    ).toBe(false);
    expect(
      postInput.parse({
        ...post,
        body: "A paragraph containing <script>alert(1)</script>\n\nAnother thought.",
      }).body,
    ).toContain("\n\n");
    expect(
      profileInput.safeParse({
        displayName: "Name",
        bio: "",
        expectedVersion: 1,
        handle: "rewrite",
      }).success,
    ).toBe(false);
    expect(
      postInput.safeParse({ ...post, title: "hello\u0085world" }).success,
    ).toBe(false);
    expect(projectUrl.safeParse("https://example.org/\u0085").success).toBe(
      false,
    );
  });
  it("rejects reserved identities and unaccepted policies", () => {
    const valid = {
      handle: "someone",
      displayName: "Someone",
      rulesVersion: "v1",
      termsVersion: "v1",
      adultAcknowledged: true,
    };
    expect(onboardingInput.safeParse(valid).success).toBe(true);
    for (const handle of [
      "admin",
      "moderator",
      "support",
      "bong",
      "account",
      "WithCaps",
      " space",
    ])
      expect(onboardingInput.safeParse({ ...valid, handle }).success).toBe(
        false,
      );
    expect(
      onboardingInput.safeParse({ ...valid, adultAcknowledged: false }).success,
    ).toBe(false);
  });
});
