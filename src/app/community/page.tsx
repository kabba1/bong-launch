import Link from "next/link";
import { Icon } from "@/components/Icon";
import { publicSettings, safeHttps } from "@/lib/site";

export const metadata = {
  title: "Community — Coming Soon",
  description:
    "Good thoughts deserve good company. The BONG community space is coming soon.",
  alternates: { canonical: "/community" },
};

export default function Community() {
  const x = safeHttps(publicSettings.socials.x);
  const telegram = safeHttps(publicSettings.socials.telegram);
  return (
    <section className="page community-page">
      <div className="community-card">
        <div className="community-copy">
          <p className="eyebrow">
            <Icon name="spark" size={16} /> Good company. On the way.
          </p>
          <h1>
            Community <span>— Coming Soon</span>
          </h1>
          <p className="lead">
            Big thoughts. Half-baked plans. People who get it.
          </p>
          <p>
            We’re making a little room for all of them. The BONG community space
            is coming soon. Until then, keep the ideas coming.
          </p>
          {x || telegram ? (
            <div className="community-socials">
              <p>Follow along on our official channels.</p>
              <div className="form-actions">
                {x && (
                  <a
                    className="button dark"
                    href={x}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BONG on X <Icon name="arrow" size={18} />
                  </a>
                )}
                {telegram && (
                  <a
                    className="button quiet"
                    href={telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BONG on Telegram <Icon name="arrow" size={18} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="community-socials muted">
              Our official social links will appear here when they’re ready.
            </p>
          )}
          <Link className="text-link" href="/">
            Find your next idea <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="community-art">
          <img
            src="/images/bong-480.webp"
            width="480"
            height="480"
            alt="The original BONG glass bong illustration on an orange background"
          />
          <span className="community-art-note">
            Curiosity welcome.
            <br />
            Genius optional.
          </span>
        </div>
      </div>
      <div className="community-next">
        <p>A thousand thoughts to keep you company in the meantime.</p>
        <Link className="text-link" href="/through-time">
          Take a trip through time <Icon name="arrow" size={18} />
        </Link>
      </div>
    </section>
  );
}
