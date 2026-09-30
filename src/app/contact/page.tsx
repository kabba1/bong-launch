import { publicSettings, safeHttps } from "@/lib/site";
import { Icon } from "@/components/Icon";
export const metadata = { title: "Contact" };
export default function Contact() {
  const x = safeHttps(publicSettings.socials.x);
  const telegram = safeHttps(publicSettings.socials.telegram);
  return (
    <section className="page narrow reading">
      <p className="eyebrow">BONG / Contact</p>
      <h1>Contact.</h1>
      {publicSettings.contacts.support ? (
        <>
          <h2>Questions and corrections</h2>
          <a
            className="text-link"
            href={`mailto:${publicSettings.contacts.support}`}
          >
            {publicSettings.contacts.support}
          </a>
        </>
      ) : (
        <p className="notice">A support email has not been published yet.</p>
      )}
      {publicSettings.contacts.security && (
        <>
          <h2>Security reports</h2>
          <a
            className="text-link"
            href={`mailto:${publicSettings.contacts.security}`}
          >
            {publicSettings.contacts.security}
          </a>
        </>
      )}
      {(x || telegram) && (
        <section aria-labelledby="contact-channels">
          <h2 id="contact-channels">Official channels</h2>
          <div className="form-actions">
            {x && (
              <a
                className="button dark"
                href={x}
                target="_blank"
                rel="noopener noreferrer"
              >
                X <Icon name="arrow" size={18} />
              </a>
            )}
            {telegram && (
              <a
                className="button quiet"
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram <Icon name="arrow" size={18} />
              </a>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
