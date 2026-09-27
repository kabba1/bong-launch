import { publicSettings } from "@/lib/site";
export const metadata = { title: "Contact" };
export default function Contact() {
  return (
    <section className="page narrow reading">
      <p className="eyebrow">Start a conversation</p>
      <h1>Get in touch.</h1>
      {publicSettings.contacts.support ? (
        <>
          <h2>Questions, corrections, and appeals</h2>
          <a href={`mailto:${publicSettings.contacts.support}`}>
            {publicSettings.contacts.support}
          </a>
        </>
      ) : (
        <p className="notice">
          The operator’s support and appeal contact is being confirmed.
          Community accounts will remain closed until there’s a real person to
          contact.
        </p>
      )}
      {publicSettings.contacts.security && (
        <>
          <h2>Security reports</h2>
          <a href={`mailto:${publicSettings.contacts.security}`}>
            {publicSettings.contacts.security}
          </a>
        </>
      )}
    </section>
  );
}
