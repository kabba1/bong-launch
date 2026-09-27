import { AccountHome } from "@/features/accounts/AccountHome";
import { AccountNavigation } from "@/features/accounts/AccountNavigation";
export const metadata = {
  title: "Your account · BONG",
  robots: { index: false, follow: false },
};
export default function AccountPage() {
  return (
    <section className="page">
      <p className="eyebrow">Make yourself at home</p>
      <h1>Your account</h1>
      <AccountNavigation />
      <AccountHome />
    </section>
  );
}
