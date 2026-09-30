import Link from "next/link";
import { CopyAddress } from "@/components/CopyAddress";
import { publicSettings, safeHttps } from "@/lib/site";
import { communityEnabled } from "@/lib/launch-scope";
import { listPublishedTimeline } from "@/server/content";
import "@/styles/story-pages.css";
export const metadata = {
  title: "About / $BONG",
  description:
    "What BONG is, how the generator works, and official information about the associated memecoin.",
  alternates: { canonical: "/about" },
};
export default function About() {
  const token = publicSettings.token;
  const community = communityEnabled();
  const timelineReady = listPublishedTimeline().length > 0;
  return (
    <article className="page story-about">
      <section
        className="story-section story-opening"
        aria-labelledby="about-bong-title"
      >
        <p className="story-index">The story</p>
        <div className="story-body">
          <h1 id="about-bong-title">So… what is BONG?</h1>
          <p className="story-fiction-label">
            <strong>BONG’s version · Fiction</strong>
          </p>
          <p>
            BONG has always been around, quietly nudging humanity toward ideas,
            good and bad. It shamelessly takes credit for the good ones.
          </p>
          <p className="story-gag">
            The pyramids? BONG. The wheel? BONG. Relativity? BONG. Tinder? BONG,
            but that one might have been a mistake.
          </p>
          <p className="story-disclaimer">
            This is a bit, not a claim. Nothing on this site claims that any
            real person or invention was inspired by drug use.
          </p>
        </div>
      </section>
      <div className="story-guide">
        <section
          className="story-guide-section"
          aria-labelledby="about-generator"
        >
          <h2 id="about-generator">The generator</h2>
          <div className="story-guide-copy">
            <p>Press the button for an idea from a fixed list.</p>
            <Link href="/" className="text-link">
              Get an idea <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section
          className="story-guide-section"
          aria-labelledby="about-history"
        >
          <div className="story-guide-heading">
            <h2 id="about-history">Bong Through Time</h2>
            {!timelineReady && <span className="coming-note">Coming soon</span>}
          </div>
          <div className="story-guide-copy">
            <p>
              Real, sourced history. BONG’s fictional version is clearly marked
              alongside the facts.
            </p>
            <Link href="/through-time" className="text-link">
              Visit Through Time <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section
          className="story-guide-section"
          aria-labelledby="about-community"
        >
          {community ? (
            <>
              <h2 id="about-community">Hear me out. Made this.</h2>
              <div className="story-guide-copy">
                <p>
                  The board has room for both. Share a thought you’re
                  considering, or something you’ve actually worked on. Tell
                  people what you contributed and what stage it’s reached. A
                  sketch, a render, and a finished build each have their place
                  when they’re described honestly.
                </p>
                <Link href="/board" className="button primary">
                  Explore the board
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="story-guide-heading">
                <h2 id="about-community">Community</h2>
                <span className="coming-note">Coming soon</span>
              </div>
              <div className="story-guide-copy">
                <p>
                  The forum is coming later. Share an idea or show what you’ve
                  made.
                </p>
                <Link href="/community" className="text-link">
                  Find the community <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
      <section
        id="bong-token"
        className="story-section story-token"
        aria-labelledby="about-token"
      >
        <p className="story-index">Official information</p>
        <div className="story-body">
          <h2 id="about-token">$BONG</h2>
          {publicSettings.tokenStatus === "live" &&
          token &&
          safeHttps(token.url) ? (
            <div className="form-card flow">
              <p>
                $BONG is the memecoin associated with this project. You don’t
                need to buy or hold it to use the site or take part in the
                community.
              </p>
              <p>
                <strong>Network:</strong> {token.network}
              </p>
              <p>
                <strong>Owner-verified contract:</strong>
                <br />
                <code className="post-body">{token.address}</code>
              </p>
              <CopyAddress address={token.address} />
              <p>{token.disclosure}</p>
              <p>
                Verify the full address independently. A name or ticker alone
                does not identify a token.
              </p>
              <a
                href={token.url}
                target="_blank"
                rel="noopener noreferrer"
                className="button quiet"
              >
                Official token page ↗
              </a>
              <p>Memecoins are speculative and can lose all their value.</p>
              <p>
                This site does not connect to your wallet or process token
                purchases.
              </p>
            </div>
          ) : (
            <>
              <p>$BONG is coming soon.</p>
              <div className="notice">
                <strong>
                  No official contract address has been published on this site.
                </strong>
                <p>
                  Be careful with accounts or tokens using the same name.
                  Official links will appear on this site.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </article>
  );
}
