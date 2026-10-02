import Link from "next/link";
import { publicSettings, safeHttps } from "@/lib/site";
export function Footer({
  communityEnabled = false,
}: {
  communityEnabled?: boolean;
}) {
  return (
    <footer className="site-footer rebrand-footer">
      <div className="footer-top">
        <Link
          href="/"
          prefetch={false}
          className="footer-wordmark"
          aria-label="BONG home"
        >
          BONG
        </Link>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/through-time" prefetch={false}>
            Through Time
          </Link>
          <Link
            href={communityEnabled ? "/board" : "/community"}
            prefetch={false}
          >
            {communityEnabled ? "The Board" : "Community"}
          </Link>
          <Link href="/about" prefetch={false}>
            About / $BONG
          </Link>
          {communityEnabled && (
            <Link href="/community-rules" prefetch={false}>
              Community rules
            </Link>
          )}
          {safeHttps(publicSettings.socials.x) && (
            <a href={publicSettings.socials.x} rel="noopener noreferrer">
              X
            </a>
          )}
          {safeHttps(publicSettings.socials.telegram) && (
            <a href={publicSettings.socials.telegram} rel="noopener noreferrer">
              Telegram
            </a>
          )}
        </nav>
      </div>
      <div className="footer-bottom">
        <nav className="footer-policy-links" aria-label="Policies">
          <Link href="/privacy" prefetch={false}>
            Privacy
          </Link>
          <Link href="/terms" prefetch={false}>
            Terms
          </Link>
          <Link href="/accessibility" prefetch={false}>
            Accessibility
          </Link>
        </nav>
      </div>
    </footer>
  );
}
