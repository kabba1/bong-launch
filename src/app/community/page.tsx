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
    <section className="page story-community community-page">
      <header className="community-teaser-heading">
        <h1>Community.</h1>
      </header>
      <div className="community-teaser-layout">
        <div className="community-teaser-copy">
          <p className="story-lead">Share an idea. Show what you made.</p>
          <p className="coming-note">Forum coming soon</p>
          {(x || telegram) && (
            <div className="community-socials">
              <h2>Already here</h2>
              <p>
                Find BONG on{" "}
                {x && telegram ? "X and Telegram" : x ? "X" : "Telegram"}.
              </p>
              <div className="form-actions">
                {x && (
                  <a
                    className="button primary"
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
          )}
        </div>
        <div className="community-art" aria-hidden="true">
          <img
            src="/images/bong-800.webp?v=6258878bd703"
            srcSet="/images/bong-480.webp?v=6258878bd703 480w, /images/bong-800.webp?v=6258878bd703 800w, /images/bong-1254.webp?v=6258878bd703 1254w"
            sizes="(max-width: 760px) 260px, (max-width: 1200px) 34vw, 420px"
            width="1254"
            height="1254"
            alt=""
          />
        </div>
      </div>
    </section>
  );
}
