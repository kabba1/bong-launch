import { headers } from "next/headers";
import { EmailCodeForm } from "@/features/auth/EmailCodeForm";
export const metadata = {
  title: "Sign in · BONG",
  robots: { index: false, follow: false },
};
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <section className="page narrow">
      <p className="eyebrow">Come on in</p>
      <h1>
        Good ideas welcome.
        <br />
        Odd ones, too.
      </h1>
      <p className="lead">
        Read freely. Sign in with an email code when you want to join the
        conversation.
      </p>
      <section className="flow">
        <EmailCodeForm
          siteKey={process.env.TURNSTILE_SITE_KEY}
          nonce={nonce}
          returnTo={query.returnTo}
        />
      </section>
    </section>
  );
}
