import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { z } from "zod";
import { policySchema } from "@/lib/content-config";
import "@/styles/info-pages.css";

const draftPolicySchema = policySchema.extend({
  version: policySchema.shape.version.regex(/-draft$/),
  approvedAt: z.literal(""),
  approvedBy: z.literal(""),
});

function readPolicy(slug: string) {
  // Drafts are local editorial previews, never a fallback for a public build.
  if (process.env.NODE_ENV === "development") {
    const draftPath = join(
      process.cwd(),
      "content",
      "previews",
      "legal",
      `${slug}.json`,
    );
    if (existsSync(draftPath)) {
      return {
        document: draftPolicySchema.parse(
          JSON.parse(readFileSync(draftPath, "utf8")),
        ),
        isDraft: true,
      };
    }
  }
  const path = join(process.cwd(), "content", "legal", `${slug}.json`);
  return {
    document: existsSync(path)
      ? policySchema.parse(JSON.parse(readFileSync(path, "utf8")))
      : null,
    isDraft: false,
  };
}

export function PolicyPage({
  slug,
  title,
}: {
  slug: "privacy" | "terms" | "community-rules" | "accessibility";
  title: string;
}) {
  const { document, isDraft } = readPolicy(slug);
  return (
    <article className="page narrow reading policy-page">
      <header className="policy-heading">
        <p className="eyebrow">BONG / {title}</p>
        <h1>{title}.</h1>
      </header>
      {document ? (
        <>
          <p className="tiny policy-version">
            {isDraft ? (
              "Draft for review"
            ) : (
              <>
                Version {document.version} · Published{" "}
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "long",
                  timeZone: "UTC",
                }).format(new Date(document.approvedAt))}
              </>
            )}
          </p>
          {document.sections.map((s, i) => (
            <section className="policy-section" key={i}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          ))}
        </>
      ) : (
        <div className="notice">
          <p>This policy is not available yet.</p>
        </div>
      )}
      <Link href="/" className="text-link policy-back">
        ← Back to the Bong
      </Link>
    </article>
  );
}
