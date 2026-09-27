import { z } from "zod";

const controls = /\p{Cc}/u;
export const text = (min: number, max: number, multiline = false) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine(
      (s) => [...s].length >= min && [...s].length <= max,
      `Use ${min} to ${max} characters.`,
    )
    .refine(
      (s) => !controls.test(multiline ? s.replace(/[\r\n]/g, "") : s),
      "Remove control characters.",
    );
export const uuid = z.uuid();
export const version = z.number().int().positive().max(2_147_483_647);
export const projectUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      if (/[\p{Cc}\s\\]/u.test(value)) return false;
      const u = new URL(value);
      return (
        u.protocol === "https:" && !!u.hostname && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Use a complete HTTPS URL without credentials.");
const optionalUrl = projectUrl.nullable().optional();
export const assets = z
  .array(z.strictObject({ id: uuid, altText: text(10, 300) }))
  .max(4)
  .default([]);
const postFields = {
  title: text(5, 100),
  body: text(20, 5000, true),
  projectUrl: optionalUrl,
  sourceIdeaId: z
    .string()
    .regex(/^BONG-\d{4}$/)
    .nullable()
    .optional(),
  assets,
};
export const postInput = z.strictObject({
  kind: z.enum(["hear_me_out", "made_this"]),
  ...postFields,
  idempotencyKey: uuid,
});
export const postEditInput = z.strictObject({
  ...postFields,
  expectedVersion: version,
});
export const deleteInput = z.strictObject({
  expectedVersion: version,
  confirmed: z.literal(true),
});
export const commentInput = z.strictObject({
  body: text(1, 2000, true),
  replyToCommentId: uuid.nullable().optional(),
  idempotencyKey: uuid,
});
export const commentEditInput = z.strictObject({
  body: text(1, 2000, true),
  expectedVersion: version,
});
export const reservedHandles = new Set([
  "admin",
  "administrator",
  "moderator",
  "support",
  "security",
  "bong",
  "official",
  "team",
  "api",
  "account",
  "about",
  "board",
  "contact",
  "privacy",
  "terms",
  "sign_in",
  "onboarding",
  "timeline",
  "members",
  "moderation",
  "idea",
  "accessibility",
]);
export const handle = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_]{2,23}$/)
  .refine(
    (value) => !reservedHandles.has(value),
    "Choose a handle that does not imply staff or site identity.",
  );
export const onboardingInput = z.strictObject({
  handle,
  displayName: text(0, 40).default(""),
  rulesVersion: text(1, 60),
  termsVersion: text(1, 60),
  adultAcknowledged: z.literal(true),
});
export const profileInput = z.strictObject({
  displayName: text(1, 40),
  bio: text(0, 240, true),
  expectedVersion: version,
});
// Supabase Auth stores and looks up email using strings.ToLower (internal/models/user.go).
// Match that identity for distributed limits; preserve dots and plus tags.
export const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const requestCodeInput = z.strictObject({
  email,
  captchaToken: z.string().min(1).max(2048),
});
export const verifyCodeInput = z.strictObject({
  email,
  code: z.string().regex(/^\d{6}$/),
  returnTo: z.string().max(1024).optional(),
});
export const mfaVerifyInput = z.strictObject({
  factorId: uuid,
  code: z.string().regex(/^\d{6}$/),
});
export const emptyInput = z.strictObject({});
export const reportInput = z.strictObject({
  targetType: z.enum(["post", "comment", "member", "idea", "timeline"]),
  targetId: text(1, 100),
  reason: z.enum([
    "spam_scam",
    "harassment",
    "privacy",
    "dangerous_illegal",
    "misleading_authorship",
    "factual_correction",
    "copyright_rights",
    "other",
  ]),
  detail: text(0, 1000, true).default(""),
  captchaToken: z.string().max(2048).optional(),
});
export const decisionInput = z.strictObject({
  targetType: z.enum(["post", "comment", "report"]),
  id: uuid,
  revisionId: uuid.optional(),
  expectedVersion: version,
  action: z.enum([
    "approve",
    "reject",
    "hide",
    "restore",
    "escalate",
    "resolve",
  ]),
  reason: text(3, 1000, true),
  privateNote: text(0, 1000, true).optional(),
});
export const memberStatusInput = z.strictObject({
  action: z.enum([
    "trust",
    "untrust",
    "suspend",
    "unsuspend",
    "ban",
    "unban",
    "hide-content",
  ]),
  reason: text(3, 1000, true),
  until: z.iso.datetime().optional(),
});
export const featureInput = z.strictObject({
  name: z
    .enum([
      "posting_enabled",
      "uploads_enabled",
      "registrations_enabled",
      "review_everything",
      "POSTING_ENABLED",
      "UPLOADS_ENABLED",
      "REGISTRATIONS_ENABLED",
      "REVIEW_ALL_SUBMISSIONS",
    ])
    .transform((value) =>
      value === "REVIEW_ALL_SUBMISSIONS"
        ? "review_everything"
        : value.toLowerCase(),
    ),
  value: z.boolean(),
  expectedVersion: version,
  reason: text(3, 1000, true),
});
export const accountDeleteInput = z.strictObject({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});
export const listQuery = z.strictObject({
  kind: z.enum(["hear_me_out", "made_this"]).optional(),
  query: text(2, 100).optional(),
  cursor: z
    .string()
    .max(1024)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const pageQuery = z.strictObject({
  cursor: z
    .string()
    .max(1024)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
  state: z
    .enum(["pending", "published", "rejected", "hidden", "deleted"])
    .optional(),
});
