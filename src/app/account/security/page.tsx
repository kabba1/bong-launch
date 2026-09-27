import { headers } from "next/headers";
import { Security } from "@/features/accounts/Security";
import { AccountNavigation } from "@/features/accounts/AccountNavigation";
export const metadata = {
  title: "Account security · BONG",
  robots: { index: false, follow: false },
};
export default async function SecurityPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <section className="page narrow">
      <p className="eyebrow">Keep your access yours</p>
      <h1>Account security</h1>
      <AccountNavigation />
      <Security siteKey={process.env.TURNSTILE_SITE_KEY} nonce={nonce} />
    </section>
  );
}
