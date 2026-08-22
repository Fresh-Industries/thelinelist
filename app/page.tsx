import { CategoryCards } from "@/components/CategoryCards";
import { CopackerCard } from "@/components/CopackerCard";
import { EditorialImage } from "@/components/EditorialImage";
import { FinderForm } from "@/components/FinderForm";
import { HowItWorks } from "@/components/HowItWorks";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SponsoredSlot } from "@/components/ads/SponsoredSlot";
import { getVerifiedPlants, verifiedStates } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Find a U.S. food and beverage manufacturer",
  description:
    "Compare verified U.S. food and beverage manufacturers by product, process, location, packaging, and minimum order. About 36 plant-site-verified companies.",
  path: "/",
});

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
              <p className="kicker">For CPG founders ready to manufacture</p>
              <h1>Find the right U.S. food and beverage manufacturer.</h1>
              <p className="sub">
                Compare verified U.S. food and beverage manufacturers by product, process, location,
                packaging, and minimum order. About {count} companies, each checked against the
                plant&apos;s own site.
              </p>
            </div>
            <figure className="hero-visual">
              <EditorialImage
                src="/images/hero-produce.svg"
                alt="Decorative illustration of bottles and produce. Not a photograph of a named plant."
                width={640}
                height={520}
                sizes="(max-width: 860px) 100vw, 40vw"
                priority
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
            Alphabetical from the verified set, not a ranking, not ratings.
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
