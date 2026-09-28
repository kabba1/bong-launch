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
        <p className="story-index">01 / The story</p>
        <div className="story-body">
          <h1 id="about-bong-title">So… what is BONG?</h1>
          <p>
            Every good idea, bad idea, and completely unhinged idea has a
            beginning. BONG likes to think it was somewhere nearby.
          </p>
          <p>
            This project is about the spark that sends your imagination
            somewhere unexpected—and what happens when you follow it.
          </p>
        </div>
      </section>
      <section className="story-section" aria-labelledby="about-generator">
        <p className="story-index">02 / The Bong</p>
        <div className="story-body">
          <h2 id="about-generator">The generator</h2>
          <p>
            Press the button and BONG will give you an idea. Use it, ignore it,
            or see where it goes.
          </p>
          <Link href="/" className="text-link">
            Get an idea <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="story-section" aria-labelledby="about-history">
        <p className="story-index">03 / Through Time</p>
        <div className="story-body">
          <h2 id="about-history">Bong Through Time</h2>
          <p>
            A timeline of ideas and inventions, and the stories of how they came
            to be.
          </p>
          <Link href="/through-time" className="text-link">
            Visit Through Time <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="story-section" aria-labelledby="about-community">
        <p className="story-index">04 / Good company</p>
        <div className="story-body">
          {community ? (
            <>
              <h2 id="about-community">Hear me out. Made this.</h2>
              <p>
                The board has room for both. Share a thought you’re considering,
                or something you’ve actually worked on. Tell people what you
                contributed and what stage it’s reached. A sketch, a render, and
                a finished build each have their place when they’re described
                honestly.
              </p>
              <Link href="/board" className="button primary">
                Explore the board
              </Link>
            </>
          ) : (
            <>
              <h2 id="about-community">Community — coming soon</h2>
              <p>
                The forum is coming later. You’ll be able to share your own
                ideas and things you’ve made.
              </p>
              <Link href="/community" className="text-link">
                Visit the community page <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </div>
      </section>
      <section
        id="bong-token"
        className="story-section"
        aria-labelledby="about-token"
      >
        <p className="story-index">05 / $BONG</p>
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
