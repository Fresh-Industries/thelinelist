import { CategoryCards } from "@/components/CategoryCards";
import { CopackerCard } from "@/components/CopackerCard";
import { FinderForm } from "@/components/FinderForm";
import { HowItWorks } from "@/components/HowItWorks";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SponsoredSlot } from "@/components/ads/SponsoredSlot";
import { getVerifiedPlants, verifiedStates } from "@/lib/directory";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "From idea to shelf. Find the right US manufacturer",
  description:
    "Verified U.S. manufacturers for beverages, sauces, and refrigerated foods. Describe what you’re making in plain language. Named plants only. Not CoPack Connect. Not a login.",
};

export default function HomePage() {
  const plants = getVerifiedPlants();
  const count = plants.length;
  const states = verifiedStates();
  const featured = [...plants]
    .sort((left, right) => left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug))
    .slice(0, 8);

  return (
    <>
      <SiteHeader current="/" />
      <main id="main" className="home">
        <section className="hero-immersive">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="kicker">For first-time CPG founders</p>
              <h1>From idea to shelf. We connect you to the right makers.</h1>
              <p className="sub">
                Verified U.S. manufacturers for beverages, sauces, and refrigerated
                foods. {count} plant-site-verified companies — no invented listings.
              </p>
            </div>
            <figure className="hero-visual">
              <Image
                src="/images/hero-produce.svg"
                alt="Illustration of bottles and produce — decorative, not a specific plant."
                width={640}
                height={520}
              />
            </figure>
          </div>
          <div className="wrap">
            <FinderForm states={states} variant="match" />
          </div>
        </section>

        <div className="wrap">
          <CategoryCards />
        </div>

        <HowItWorks />

        <section className="makers wrap" aria-labelledby="makers-heading">
          <div className="section-head">
            <h2 id="makers-heading">Verified manufacturers</h2>
            <Link href="/copackers">View all →</Link>
          </div>
          <p className="section-note">
            Alphabetical from the verified set — not a ranking, not ratings.
          </p>
          <div className="maker-scroller">
            {featured.map((plant) => (
              <CopackerCard key={plant.slug} plant={plant} />
            ))}
          </div>
        </section>

        <div className="wrap">
          <SponsoredSlot position="homepage" />
          <NewsletterCta />
        </div>
      </main>
    </>
  );
}
