import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopackerCard } from "@/components/CopackerCard";
import { EditorialImage } from "@/components/EditorialImage";
import { FinderForm } from "@/components/FinderForm";
import { JsonLd } from "@/components/JsonLd";
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
import { itemListJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = pageMetadata({
  title: "U.S. food and beverage manufacturer directory",
  description:
    "Filter plant-site-verified company cards. Unknown fields stay unpublished. Organic order is A to Z.",
  path: "/copackers",
});

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
      <JsonLd data={itemListJsonLd(plants)} />
      <main id="main">
        <div className="wrap">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Find manufacturers", href: "/copackers" },
            ]}
          />
          <div className="directory-head">
            <div>
              <p className="kicker">Find Manufacturers</p>
              <h1>
                {productName ? `Manufacturers for ${productName}` : "Compare U.S. manufacturers"}
              </h1>
              <p className="lede">
                Filter plant-site-verified company cards. Unknown fields stay unpublished. Organic
                order is A to Z. Sponsored slots sit apart when we have them.
              </p>
            </div>
            <EditorialImage
              src="/images/directory-header.svg"
              alt="Decorative illustration of a manufacturer directory. Not a photograph of a named plant."
              width={420}
              height={280}
              sizes="(max-width: 860px) 100vw, 20rem"
              className="directory-visual"
            />
          </div>

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
              <EditorialImage
                src="/images/directory-header.svg"
                alt="Decorative illustration for an empty manufacturer search. Not a photograph of a named plant."
                width={420}
                height={280}
                sizes="18rem"
              />
              <p>
                No verified plant matches those filters. We will not invent a match. Set process or
                product to Not sure, or widen the state. We only show coverage we have.
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
