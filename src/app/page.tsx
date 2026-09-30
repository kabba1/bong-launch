import Link from "next/link";
import { Generator } from "@/features/generator/Generator";
import { BoardPreview } from "@/components/BoardPreview";
import { Icon } from "@/components/Icon";
import { communityEnabled } from "@/lib/launch-scope";
import { listPublishedTimeline } from "@/server/content";
export default function Home() {
  const community = communityEnabled();
  const timelineReady = listPublishedTimeline().length > 0;
  return (
    <>
      <Generator communityEnabled={community} />
      <section className="container explore-section">
        <div className="thought-destinations">
          <article className="thought-destination">
            <h2>Bong Through Time</h2>
            {!timelineReady && <span className="coming-note">Coming soon</span>}
            <p>Real history. BONG takes the credit.</p>
            <Link className="text-link" href="/through-time">
              Visit Through Time <Icon name="arrow" size={18} />
            </Link>
          </article>
          {community ? (
            <BoardPreview />
          ) : (
            <article className="thought-destination">
              <h2>Community</h2>
              <span className="coming-note">Coming soon</span>
              <p>Share an idea. Show what you made.</p>
              <Link className="text-link" href="/community">
                About the community <Icon name="arrow" size={18} />
              </Link>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
