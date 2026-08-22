import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { UtmCapture } from "@/components/UtmCapture";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME, SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Find a U.S. food and beverage manufacturer | The Line List",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Compare verified U.S. food and beverage manufacturers by product, process, location, packaging, and minimum order. About 36 plant-site-verified companies.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Find a U.S. food and beverage manufacturer | The Line List",
    description:
      "Compare verified U.S. food and beverage manufacturers by product, process, location, packaging, and minimum order.",
  },
  twitter: {
    card: "summary",
    title: "Find a U.S. food and beverage manufacturer | The Line List",
    description:
      "Compare verified U.S. food and beverage manufacturers by product, process, location, packaging, and minimum order.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <UtmCapture />
        <AnalyticsScripts />
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
