import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import "@/styles/rebrand.css";
import "@/styles/rebrand-shell.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { origin, isProduction } from "@/lib/site";
import { communityEnabled } from "@/lib/launch-scope";
const displayFont = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-bricolage",
  display: "swap",
  preload: true,
});
const bodyFont = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
});
export const metadata: Metadata = {
  metadataBase: new URL(origin()),
  title: {
    default: "BONG",
    template: "%s · BONG",
  },
  description:
    "Click the bong for an idea. Explore Bong Through Time and find the BONG community.",
  robots: isProduction()
    ? { index: true, follow: true }
    : { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  const community = communityEnabled();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header communityEnabled={community} />
        <main id="main">{children}</main>
        <Footer communityEnabled={community} />
      </body>
    </html>
  );
}
