import { CopackerCard } from "@/components/CopackerCard";
import { FinderForm } from "@/components/FinderForm";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SponsoredSlot } from "@/components/ads/SponsoredSlot";
import { filterPlants, parseDirectoryQuery, verifiedStates } from "@/lib/directory";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "US co-packer directory",
  description:
    "Plant-site-verified US co-packers as company cards. Filter by product, process, published small MOQ, and state.",
};

export default async function CopackersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseDirectoryQuery(params);
  const plants = filterPlants(query);
  const states = verifiedStates();

  return (
    <>
      <SiteHeader current="/copackers" />
      <main id="main">
        <div className="wrap">
          <p className="kicker">Directory</p>
          <h1>US co-packers</h1>
          <p className="lede">
            Company cards from plant-site-verified listings. Unknown fields stay
            unknown. Organic ranking is alphabetical — sponsored slots sit
            separately.
          </p>

          <Suspense>
            <FinderForm states={states} initial={query} live submitLabel="Update results" />
          </Suspense>

          <SponsoredSlot position="directory-top" />

          <div className="results-head">
            <p>
              {plants.length} {plants.length === 1 ? "company" : "companies"}
            </p>
          </div>

          {plants.length === 0 ? (
            <div className="empty-results">
              <p>
                No verified plant matches those filters. Try “Not sure” on process
                or product — we only show coverage we actually have.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {plants.map((plant) => (
                <CopackerCard key={plant.slug} plant={plant} />
              ))}
            </div>
          )}

          <NewsletterCta />
        </div>
      </main>
    </>
  );
}
