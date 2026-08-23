import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { UtmCapture } from "@/components/UtmCapture";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: {
    default: "The Line List | Food and Beverage Manufacturers",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Learn what your food or drink product needs, find manufacturers that may fit, and prepare for your first conversation.",
  alternates: { canonical: absoluteUrl() },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: absoluteUrl(),
    siteName: SITE_NAME,
    title: "The Line List | Food and Beverage Manufacturers",
    description:
      "Learn what your food or drink product needs, find manufacturers that may fit, and prepare for your first conversation.",
    images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: "The Line List" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Line List | Food and Beverage Manufacturers",
    description:
      "Learn what your food or drink product needs, find manufacturers that may fit, and prepare for your first conversation.",
    images: [absoluteUrl("/opengraph-image")],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
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
