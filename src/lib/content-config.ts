import { z } from "zod";
const text = z.string().trim().min(1).max(10000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)
  .refine((v) => Number.isFinite(Date.parse(v)), "Use a real date.");
const https = z
  .string()
  .url()
  .refine((v) => {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use an HTTPS URL without credentials.");
const email = z
  .string()
  .email()
  .refine(
    (v) => !/@(?:[^@]*\.)?(?:invalid|example|test|localhost)$/.test(v),
    "Use a real monitored contact.",
  );
export const approvalSchema = z
  .object({ approvedBy: text, approvedAt: date, evidence: text })
  .strict();
export const policySchema = z
  .object({
    title: text,
    version: text,
    approvedAt: date,
    approvedBy: text,
    sections: z
      .array(
        z
          .object({ heading: text, paragraphs: z.array(text).min(1).max(30) })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export const siteSchema = z
  .object({
    tokenStatus: z.enum(["not_launched", "live"]),
    token: z
      .object({ address: text, network: text, url: https, disclosure: text })
      .strict()
      .nullable(),
    socials: z
      .object({ x: https.optional(), telegram: https.optional() })
      .strict(),
    contacts: z
      .object({ support: email.optional(), security: email.optional() })
      .strict(),
    policies: z
      .object({ rulesVersion: text.nullable(), legalVersion: text.nullable() })
      .strict(),
    approvals: z.record(z.string(), approvalSchema),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.tokenStatus === "live" && !v.token)
      ctx.addIssue({
        code: "custom",
        message: "A live token needs verified identifiers and disclosure.",
        path: ["token"],
      });
    if (v.tokenStatus === "not_launched" && v.token)
      ctx.addIssue({
        code: "custom",
        message: "Do not publish token identifiers in the prelaunch state.",
        path: ["token"],
      });
  });
