import Link from "next/link";
import { publicSettings, safeHttps } from "@/lib/site";
export function Footer({
  communityEnabled = false,
}: {
  communityEnabled?: boolean;
}) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="wordmark">
            BONG
          </Link>
          <p>A home for half-baked ideas.</p>
        </div>
        <div className="footer-links">
          <Link href="/through-time">Through Time</Link>
          <Link href={communityEnabled ? "/board" : "/community"}>
            {communityEnabled ? "The Board" : "Community"}
          </Link>
          <Link href="/about">About / $BONG</Link>
          {communityEnabled && (
            <Link href="/community-rules">Community rules</Link>
          )}
          <Link href="/contact">Contact</Link>
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
        </div>
      </div>
      <div className="footer-bottom">
        <p>Curated, AI-origin ideas. Human curiosity. For entertainment.</p>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
      </div>
    </footer>
  );
}
