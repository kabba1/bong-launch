"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type Session } from "@/lib/api-client";
import { Icon } from "./Icon";
const publicLinks = [
  ["/", "The Bong"],
  ["/through-time", "Through Time"],
  ["/community", "Community"],
  ["/about", "About / $BONG"],
];
export function Header({
  communityEnabled = false,
}: {
  communityEnabled?: boolean;
}) {
  const pathname = usePathname();
  const links = publicLinks.map(([href, label]) =>
    communityEnabled && href === "/community"
      ? ["/board", "The Board"]
      : [href, label],
  );
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const isCurrent = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => {
    if (!communityEnabled) return;
    const controller = new AbortController();
    void api<Session>("/session", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setSignedIn(!!result.data.user);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname, communityEnabled]);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header rebrand-header"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <div className="header-inner">
        <Link
          href="/"
          prefetch={false}
          className="wordmark"
          aria-label="BONG home"
          onClick={() => setOpen(false)}
        >
          BONG
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {communityEnabled && (
          <Link
            className="sign-in-link"
            href={signedIn ? "/account" : "/sign-in"}
            prefetch={false}
          >
            {signedIn ? "Your account" : "Come on in"}{" "}
            <Icon name="arrow" size={17} />
          </Link>
        )}
        <button
          type="button"
          ref={toggle}
          className="mobile-toggle icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((visible) => !visible)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="mobile-nav"
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          {communityEnabled && (
            <Link
              href={signedIn ? "/account" : "/sign-in"}
              prefetch={false}
              onClick={() => setOpen(false)}
            >
              {signedIn ? "Your account" : "Sign in"}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
