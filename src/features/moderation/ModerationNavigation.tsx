"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function ModerationNavigation({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  return (
    <nav className="account-nav" aria-label="Moderation">
      <Link
        href="/moderation"
        aria-current={path === "/moderation" ? "page" : undefined}
      >
        Review queues
      </Link>
      <Link href="/account/security">Staff verification</Link>
      {admin && (
        <>
          <Link
            href="/admin/audit"
            aria-current={path === "/admin/audit" ? "page" : undefined}
          >
            Audit history
          </Link>
          <Link
            href="/admin/features"
            aria-current={path === "/admin/features" ? "page" : undefined}
          >
            Incident controls
          </Link>
        </>
      )}
    </nav>
  );
}
