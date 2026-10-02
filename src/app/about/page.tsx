import Link from "next/link";
import { CopyAddress } from "@/components/CopyAddress";
import { publicSettings, safeHttps } from "@/lib/site";
import { communityEnabled } from "@/lib/launch-scope";
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
  return (
    <article className="page story-about">
      <section
        className="story-section story-opening"
        aria-labelledby="about-bong-title"
      >
        <p className="story-index">The story</p>
        <div className="story-body">
          <h1 id="about-bong-title">So… what is BONG?</h1>
          <p className="story-presence">BONG has always been around.</p>
          <p className="story-voice">
            <span className="story-phrase story-phrase-blue">
              The pyramids? BONG.
            </span>{" "}
            <span className="story-phrase">The wheel? BONG.</span>{" "}
            <span className="story-phrase story-phrase-blue">
              Relativity? BONG.
            </span>{" "}
            <span className="story-phrase">
              Tinder? BONG, but that one might have been a mistake.
            </span>
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
            <p>Click the bong and see what comes to mind.</p>
            <Link href="/" className="button primary story-link">
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
          </div>
          <div className="story-guide-copy">
            <p>
              Some ideas made history. Explore the moments that changed how
              people lived, the problems they were trying to solve, and what
              happened next.
            </p>
            <Link href="/through-time" className="button quiet story-link">
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
                <Link href="/community" className="button quiet story-link">
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
        <div className="story-token-heading">
          <p className="story-index">Official information</p>
          <h2 id="about-token">$BONG</h2>
        </div>
        <div className="story-body">
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
