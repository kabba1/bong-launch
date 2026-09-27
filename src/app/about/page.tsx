import Link from "next/link";
import { CopyAddress } from "@/components/CopyAddress";
import { publicSettings, safeHttps } from "@/lib/site";
import { communityEnabled } from "@/lib/launch-scope";
export const metadata = {
  title: "About / $BONG",
  alternates: { canonical: "/about" },
};
export default function About() {
  const token = publicSettings.token;
  const community = communityEnabled();
  return (
    <article className="page narrow reading">
      <p className="eyebrow">The story so far</p>
      <h1>
        Good ideas come from
        <br />
        strange places.
      </h1>
      <p className="lead">
        BONG is a home for half-baked ideas. The brilliant ones, the
        questionable ones, and the ones that need a little company.
      </p>
      <h2>
        The premise is ridiculous.
        <br />
        The curiosity is real.
      </h2>
      <p>
        Imagine the same ordinary bong turning up throughout human history,
        quietly taking credit for a few of our best and worst ideas. That’s
        BONG’s fictional premise. It isn’t a claim about what actually happened
        or what anyone used.
      </p>
      <p>
        Here, you can pull a thought from a curated collection, follow the real
        stories behind historical ideas, and explore the BONG story.
      </p>
      <h2>One thousand starting points.</h2>
      <p>
        The generator draws from 1,000 supplied, AI-origin ideas across 22
        categories. It selects a thought from that fixed collection; it doesn’t
        call a live AI or build anything on your behalf.
      </p>
      <p>
        No repeats within a deck on this browser while its saved state is
        available. Clearing storage resets that progress. Ideas are
        entertainment, not instructions, professional advice, or a promise that
        nobody has thought of them before.
      </p>
      {community ? (
        <>
          <h2>Hear me out. Made this.</h2>
          <p>
            The board has room for both. Share a thought you’re considering, or
            something you’ve actually worked on. Tell people what you
            contributed and what stage it’s reached. A sketch, a render, and a
            finished build each have their place when they’re described
            honestly.
          </p>
          <Link href="/board" className="button primary">
            Explore the board
          </Link>
        </>
      ) : (
        <>
          <h2>Good company is coming.</h2>
          <p>
            The BONG community space is coming soon. For now, explore the ideas
            and follow along through our official social channels when
            available.
          </p>
          <Link href="/community" className="button primary">
            Community — Coming Soon
          </Link>
        </>
      )}
      <section id="bong-token">
        <h2>About $BONG.</h2>
        <p>
          $BONG is the associated speculative memecoin. You don’t need to buy or
          hold it to use this website or join the community.
        </p>
        {publicSettings.tokenStatus === "live" &&
        token &&
        safeHttps(token.url) ? (
          <div className="form-card flow">
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
              Verify the full address independently. A name or ticker alone does
              not identify a token.
            </p>
            <a
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button quiet"
            >
              Official token page ↗
            </a>
          </div>
        ) : (
          <div className="notice">
            <strong>No official contract is published on this site.</strong>
            <p>
              We’ll only display token details after the full identifiers and
              official links have been verified. Be careful with accounts or
              tokens using the same name.
            </p>
          </div>
        )}
        <p>
          This website has no wallet connection, token purchases, trading, or
          financial advice. The community is here for ideas.
        </p>
      </section>
    </article>
  );
}
