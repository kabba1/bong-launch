import Link from "next/link";
import { Icon } from "@/components/Icon";
import { publicSettings, safeHttps } from "@/lib/site";
import "@/styles/story-pages.css";

export const metadata = {
  title: "Community — Coming Soon",
  description:
    "The BONG forum is coming soon. Find official community links here.",
  alternates: { canonical: "/community" },
};

export default function Community() {
  const x = safeHttps(publicSettings.socials.x);
  const telegram = safeHttps(publicSettings.socials.telegram);
  return (
    <section className="page story-community">
      <header className="community-teaser-heading">
        <h1>
          Community.
          <br />
          <span>Coming soon.</span>
        </h1>
      </header>
      <div className="community-teaser-layout">
        <div className="community-teaser-copy">
          <p className="story-lead">
            A place to post an idea, show something you made, or talk about
            someone else’s.
          </p>
          {x || telegram ? (
            <div className="community-socials">
              <p>Find BONG here in the meantime.</p>
              <div className="form-actions">
                {x && (
                  <a
                    className="button dark"
                    href={x}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Follow on X <Icon name="arrow" size={18} />
                  </a>
                )}
                {telegram && (
                  <a
                    className="button quiet"
                    href={telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Telegram <Icon name="arrow" size={18} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="community-socials muted">
              Official links will appear here when they’re ready.
            </p>
          )}
          <Link className="text-link" href="/">
            Get a highdea <Icon name="arrow" size={18} />
          </Link>
        </div>
        <figure className="community-artifact">
          <img
            src="/images/bong-480.webp"
            width="480"
            height="480"
            alt="An ordinary glass bong on an orange background"
          />
          <figcaption>The usual suspect.</figcaption>
        </figure>
      </div>
      <div className="community-teaser-footer">
        <Link className="text-link" href="/through-time">
          Visit Through Time <Icon name="arrow" size={18} />
        </Link>
      </div>
    </section>
  );
}
