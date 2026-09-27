import { Onboarding } from "@/features/auth/Onboarding";
export const metadata = {
  title: "Join the community · BONG",
  robots: { index: false, follow: false },
};
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  return (
    <section className="page narrow">
      <p className="eyebrow">A quick introduction</p>
      <h1>What should we call you?</h1>
      <p className="lead">
        Choose your public name and review the participation policies before
        posting.
      </p>
      <Onboarding returnTo={query.returnTo} />
    </section>
  );
}
