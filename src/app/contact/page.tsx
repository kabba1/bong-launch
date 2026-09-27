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
          The operator’s support contact is being confirmed. Official contact
          details will appear here when they’re ready.
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
