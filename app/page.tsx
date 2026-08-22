import { FinderForm } from "@/components/FinderForm";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SponsoredSlot } from "@/components/ads/SponsoredSlot";
import { getVerifiedPlants, verifiedStates } from "@/lib/directory";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Find the right US co-packer for your product",
  description:
    "Named US co-packers, last-verified, MOQ only when the plant printed one. Find the right plant for a beverage, sauce, or refrigerated RTE SKU.",
};

export default function HomePage() {
  const count = getVerifiedPlants().length;
  const states = verifiedStates();

  return (
    <>
      <SiteHeader current="/" />
      <main id="main">
        <div className="wrap">
          <header className="hero">
            <p className="kicker">Directory + CPG weekly · 21 Aug 2026</p>
            <h1>Find the right US co-packer for your product.</h1>
            <p className="sub">
              {count} plant-site-verified companies. Named plants, last-verified,
              MOQ only when the plant printed one. Not CoPack Connect. Not a login.
            </p>
            <p className="honest">
              Working draft, not a census — unpublished stays unpublished; we do
              not invent plants, phones, emails, MOQs, certs, or search volumes.
              The 763-row public-list spreadsheet is a lead sheet, not this directory.
            </p>
          </header>

          <FinderForm states={states} />

          <SponsoredSlot position="homepage" />

          <section aria-label="Process guides">
            <p className="kicker">Guides, not the front door</p>
            <div className="guide-links">
              <Link className="guide-link" href="/guides/hpp">
                <strong>HPP</strong>
                <span>Stays cold. Juice, dip, RTE.</span>
              </Link>
              <Link className="guide-link" href="/guides/hot-fill">
                <strong>Hot fill</strong>
                <span>High-acid ambient juice, tea, sauce.</span>
              </Link>
              <Link className="guide-link" href="/guides/retort">
                <strong>Retort</strong>
                <span>Shelf-stable meals, broth, pouch.</span>
              </Link>
              <Link className="guide-link" href="/guides/small-moq">
                <strong>Small MOQ</strong>
                <span>Only plants that printed a floor.</span>
              </Link>
              <Link className="guide-link" href="/guides/sauce">
                <strong>Sauces</strong>
                <span>Hot fill, kettle, acidified.</span>
              </Link>
            </div>
          </section>

          <NewsletterCta />

          <p className="also">
            Also:{" "}
            <Link href="/glossary">
              co-packer vs co-manufacturer vs private label vs tolling
            </Link>{" "}
            — a glossary, not a plant census. How a plant gets on a page is on{" "}
            <Link href="/about">About</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
