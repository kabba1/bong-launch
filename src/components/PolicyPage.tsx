import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { policySchema } from "@/lib/content-config";
type Policy = {
  title: string;
  version: string;
  approvedAt: string;
  approvedBy: string;
  sections: { heading: string; paragraphs: string[] }[];
};
export function PolicyPage({
  slug,
  title,
}: {
  slug: "privacy" | "terms" | "community-rules" | "accessibility";
  title: string;
}) {
  const path = join(process.cwd(), "content", "legal", `${slug}.json`);
  const document: Policy | null = existsSync(path)
    ? policySchema.parse(JSON.parse(readFileSync(path, "utf8")))
    : null;
  return (
    <article className="page narrow reading">
      <p className="eyebrow">BONG / {title}</p>
      <h1>{title}.</h1>
      {document && document.approvedAt && document.approvedBy ? (
        <>
          <p className="tiny">
            Version {document.version} · Published{" "}
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "long",
              timeZone: "UTC",
            }).format(new Date(document.approvedAt))}
          </p>
          {document.sections.map((s, i) => (
            <section key={i}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          ))}
          <p>
            Contact details, when configured, appear on the{" "}
            <Link href="/contact" className="text-link">
              Contact page
            </Link>
            .
          </p>
        </>
      ) : (
        <div className="notice">
          <p>
            This page is awaiting the operator’s approved information. Public
            registration and community participation will remain closed until
            the required policies and contacts are in place.
          </p>
          <p>The idea generator is available in this local preview.</p>
        </div>
      )}
      <Link href="/" className="text-link">
        ← Back to the Bong
      </Link>
    </article>
  );
}
