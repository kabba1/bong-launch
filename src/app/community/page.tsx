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
        <h1>Community.</h1>
        <span className="coming-note">Coming soon</span>
      </header>
      <div className="community-teaser-layout">
        <div className="community-teaser-copy">
          <p className="story-lead">Share an idea. Show what you made.</p>
          {(x || telegram) && (
            <div className="community-socials">
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
          )}
        </div>
      </div>
    </section>
  );
}
