import { test, expect } from "@playwright/test";

// Browser-only DTO interception. These cases verify presentation and retained
// drafts; they do not simulate persistence or claim database authorization.
const id = "00000000-0000-4000-8000-000000000002";
const authorId = "00000000-0000-4000-8000-000000000001";
const session = {
  user: { id: authorId },
  member: { handle: "test_author", state: "active" },
  onboarded: true,
  role: null,
  postingEnabled: true,
  uploadsEnabled: false,
  registrationEnabled: true,
};
const post = {
  id,
  authorId,
  handle: "test_author",
  displayName: "Test author",
  kind: "made_this",
  state: "published",
  title: "Approved test title",
  body: "Approved test-only body for the author view.",
  sourceIdeaId: "BONG-0001",
  projectUrl: "https://approved.invalid/",
  version: 3,
  commentCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
  assets: [],
};

test("BOARD-06 edit UI declines a different author and hidden/deleted records", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { data: session, requestId: "test-only" } }),
  );
  let record = { ...post };
  await page.route(`**/api/board/posts/${id}`, (route) =>
    route.fulfill({ json: { data: record, requestId: "test-only" } }),
  );
  for (const state of ["not-author", "hidden", "deleted"]) {
    record = {
      ...post,
      authorId: state === "not-author" ? "another-author" : authorId,
      state: state === "not-author" ? "published" : state,
    };
    await page.goto(`/board/${id}/edit`);
    await expect(
      page.getByRole("heading", {
        name: "This post cannot be edited from this account",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit this revision" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Give it a title")).toHaveCount(0);
  }
});

test("BOARD-04/10 UX-06 private edit source and text survive reload and an unconfirmed response", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { data: session, requestId: "test-only" } }),
  );
  await page.route("**/api/security/csrf", (route) =>
    route.fulfill({
      json: { data: { token: "test-only-token" }, requestId: "test-only" },
    }),
  );
  let submitted: Record<string, unknown> | undefined;
  await page.route(`**/api/board/posts/${id}`, (route) => {
    if (route.request().method() === "PATCH") {
      submitted = route.request().postDataJSON();
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "UNAVAILABLE",
            message:
              "Test-only service interruption. Your changes have not been confirmed.",
          },
          requestId: "test-only",
        },
      });
    }
    return route.fulfill({
      json: {
        data: {
          ...post,
          latestRevision: {
            id: "candidate",
            title: "Private candidate title",
            body: "A private candidate body for the browser-only test.",
            state: "pending",
            sourceIdeaId: "BONG-0002",
            projectUrl: null,
            assets: [],
          },
        },
        requestId: "test-only",
      },
    });
  });
  await page.goto(`/board/${id}/edit`);
  await expect(page.getByLabel("Give it a title")).toHaveValue(
    "Private candidate title",
  );
  await expect(page.getByLabel("Project link (optional)")).toHaveValue("");
  await page.getByLabel("Give it a title").fill("A retained candidate title");
  await page.reload();
  await expect(page.getByLabel("Give it a title")).toHaveValue(
    "A retained candidate title",
  );
  await page.getByRole("button", { name: "Submit this revision" }).click();
  await expect(page.locator('main [role="alert"]')).toContainText(
    "have not been confirmed",
  );
  expect(submitted?.sourceIdeaId).toBe("BONG-0002");
  expect(submitted?.projectUrl).toBe(null);
  expect(submitted?.expectedVersion).toBe(3);
  await expect(page.getByLabel("Give it a title")).toHaveValue(
    "A retained candidate title",
  );
  await expect(page.getByText("Your thought is in good hands.")).toHaveCount(0);
});
