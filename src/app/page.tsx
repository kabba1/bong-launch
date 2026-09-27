import Link from "next/link";
import { Generator } from "@/features/generator/Generator";
import { BoardPreview } from "@/components/BoardPreview";
import { Icon } from "@/components/Icon";
import { communityEnabled } from "@/lib/launch-scope";
export default function Home() {
  const community = communityEnabled();
  return (
    <>
      <Generator communityEnabled={community} />
      <div className="ticker-strip">
        <span>BIG THOUGHTS. SMALL EXPECTATIONS.</span>
        <Icon name="spark" />
        <span>CURIOSITY WELCOME.</span>
        <Icon name="spark" />
        <span>GENIUS OPTIONAL.</span>
      </div>
      <section className="container explore-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Good things start with “what if”</p>
            <h2>Follow the thought.</h2>
          </div>
          <Link href="/about" className="text-link">
            What’s all this, then? <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="split-panels">
          <article className="explore-panel blue">
            <span className="panel-index">01 / THROUGH TIME</span>
            <h3>Human history. Questionable inspiration.</h3>
            <p>
              Our fictional story puts the same old bong behind some very big
              ideas. The real history gets its own sources.
            </p>
            <Link className="text-link" href="/through-time">
              Take a trip through time <Icon name="arrow" size={18} />
            </Link>
          </article>
          {community ? (
            <BoardPreview />
          ) : (
            <article className="explore-panel">
              <span className="panel-index">02 / COMMUNITY</span>
              <h3>Good thoughts deserve good company.</h3>
              <p>
                A place for half-baked ideas and the people behind them. The
                BONG community space is coming soon.
              </p>
              <Link className="text-link" href="/community">
                See what’s next <Icon name="arrow" size={18} />
              </Link>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
