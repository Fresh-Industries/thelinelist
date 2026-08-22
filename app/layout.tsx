import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "From idea to shelf. Find the right US manufacturer — The Line List",
    template: "%s — The Line List",
  },
  description:
    "Public US manufacturer directory for first-time CPG founders. Named plants, last-verified, MOQ only when the plant printed one. Not CoPack Connect. Not a login.",
  metadataBase: new URL("https://the-line-list.vercel.app"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
