"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AccountNavigation() {
  const path = usePathname();
  return (
    <nav className="account-nav" aria-label="Your account">
      <Link
        href="/account"
        aria-current={path === "/account" ? "page" : undefined}
      >
        Profile & contributions
      </Link>
      <Link
        href="/account/security"
        aria-current={path === "/account/security" ? "page" : undefined}
      >
        Security
      </Link>
      <Link
        href="/account/data"
        aria-current={path === "/account/data" ? "page" : undefined}
      >
        Your data
      </Link>
    </nav>
  );
}
