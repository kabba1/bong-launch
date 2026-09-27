import type { Metadata } from "next";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@/styles/globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { origin, isProduction } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(origin()),
  title: {
    default: "BONG — A home for half-baked ideas",
    template: "%s · BONG",
  },
  description:
    "Some ideas change the world. Some just sound good at the time. Find an unexpected thought, explore history, and share what you make.",
  robots: isProduction()
    ? { index: true, follow: true }
    : { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
