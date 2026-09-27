import { headers } from "next/headers";
import { AccountData } from "@/features/accounts/AccountData";
import { AccountNavigation } from "@/features/accounts/AccountNavigation";
export const metadata = {
  title: "Your data · BONG",
  robots: { index: false, follow: false },
};
export default async function DataPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <section className="page narrow">
      <p className="eyebrow">Your account, your choices</p>
      <h1>Your data</h1>
      <AccountNavigation />
      <AccountData siteKey={process.env.TURNSTILE_SITE_KEY} nonce={nonce} />
    </section>
  );
}
