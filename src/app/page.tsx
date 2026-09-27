import Link from "next/link";
import { Generator } from "@/features/generator/Generator";
import { BoardPreview } from "@/components/BoardPreview";
import { Icon } from "@/components/Icon";
export default function Home() {
  return (
    <>
      <Generator />
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
          <BoardPreview />
        </div>
      </section>
    </>
  );
}
