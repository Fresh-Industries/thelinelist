import { CopackerCard } from "@/components/CopackerCard";
import { FinderForm } from "@/components/FinderForm";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SponsoredSlot } from "@/components/ads/SponsoredSlot";
import {
  coverageNote,
  filterPlants,
  interpretProductIntent,
  parseDirectoryQuery,
  productLabel,
  verifiedStates,
} from "@/lib/directory";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "US manufacturer directory",
  description:
    "Plant-site-verified US manufacturers as company cards. Filter by product, process, published small MOQ, and state.",
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CopackersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseDirectoryQuery(params);
  const intent = interpretProductIntent(firstParam(params.q));
  const plants = filterPlants(query);
  const states = verifiedStates();
  const note = coverageNote(intent);
  const productName = query.product ? productLabel(query.product) : null;

  return (
    <>
      <SiteHeader current="/copackers" />
      <main id="main">
        <div className="wrap">
          <p className="kicker">Find Manufacturers</p>
          <h1>
            {productName ? `Matching manufacturers for ${productName}` : "US manufacturers"}
          </h1>
          <p className="lede">
            Company cards from plant-site-verified listings. Unknown fields stay
            unknown. Organic ranking is alphabetical — sponsored slots sit
            separately.
          </p>

          {note ? <p className="coverage-note">{note}</p> : null}

          <Suspense>
            <FinderForm
              states={states}
              initial={query}
              live
              initialMaking={intent.query}
              submitLabel="Update results"
            />
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
