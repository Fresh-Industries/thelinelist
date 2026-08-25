import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopackerCard } from "@/components/CopackerCard";
import { DirectoryFilters, DirectoryResultsBar } from "@/components/DirectoryFilters";
import { DirectoryPagination } from "@/components/DirectoryPagination";
import { JsonLd } from "@/components/JsonLd";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterPlants,
  isPlantIndexable,
  paginatePlants,
  queryToSearchParams,
  verifiedStates,
  type DirectoryQuery,
} from "@/lib/directory";
import { collectionPageJsonLd } from "@/lib/seo/jsonld";
import Image from "next/image";
import Link from "next/link";

export const DIRECTORY_TITLE = "Find a Manufacturer for Your Product";
export const DIRECTORY_DESCRIPTION = "Browse food and beverage manufacturers by product and location, then use optional filters for publicly sourced capabilities.";

export function ManufacturerDirectory({ query, requestedPage = 1, schemaPath = "/find-manufacturers" }: {
  query: DirectoryQuery;
  requestedPage?: number;
  schemaPath?: string;
}) {
  const allMatches = filterPlants(query);
  const page = paginatePlants(allMatches, requestedPage);
  const indexableStartPosition = allMatches
    .slice(0, page.startIndex)
    .filter(isPlantIndexable).length + 1;
  const filterKey = queryToSearchParams(query).toString() || "all";

  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <JsonLd data={collectionPageJsonLd({
        name: DIRECTORY_TITLE,
        description: DIRECTORY_DESCRIPTION,
        path: schemaPath,
        plants: page.plants.filter(isPlantIndexable),
        startPosition: indexableStartPosition,
      })} />
      <main id="main"><div className="wrap directory-page">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find manufacturers", href: "/find-manufacturers" }]} />
        <section className="directory-discovery" aria-labelledby="directory-title">
          <div className="directory-intro">
            <p className="kicker">The manufacturer directory</p>
            <h1 id="directory-title">Find a manufacturer for your product</h1>
            <p className="lede">Browse food and beverage manufacturers using publicly sourced information.</p>
          </div>
          <aside className="directory-start" aria-labelledby="directory-start-heading">
            <p className="kicker">A simpler starting point</p>
            <h2 id="directory-start-heading">Not sure what you need?</h2>
            <p>Answer a few simple questions and we’ll help narrow it down.</p>
            <Link className="btn btn-gold" href="/find-manufacturers/wizard">Help me find a manufacturer <span aria-hidden="true">→</span></Link>
          </aside>
          <DirectoryFilters key={filterKey} states={verifiedStates()} initial={query} />
        </section>
        <DirectoryResultsBar
          initial={query}
          resultCount={page.totalCount}
          currentPage={page.currentPage}
          pageSize={page.plants.length}
          startIndex={page.startIndex}
        />
        <p className="directory-trust-line">Listings are based on publicly available information. Inclusion isn’t an endorsement. <Link href="/how-we-verify">How we verify <span aria-hidden="true">→</span></Link></p>
        {page.plants.length > 0 ? <div className="card-grid">{page.plants.map((plant) => <CopackerCard key={plant.slug} plant={plant} />)}</div> : <section className="empty-results"><Image src="/images/clay-v2/support/empty-results.webp" alt="Clay sample box and magnifying glass" width={640} height={640} sizes="18rem" /><div><h2>No plants match these filters yet</h2><p>That can mean the directory has no stated capability for this mix, or the relevant fields are not public. We will not turn an unknown into a match.</p><div className="cta-band"><Link className="btn btn-gold" href="/find-manufacturers">Clear filters</Link><Link className="btn btn-ghost" href="/guides">Read a related guide</Link></div></div></section>}
        <DirectoryPagination query={query} currentPage={page.currentPage} pageCount={page.pageCount} />
        <section className="shortlist-band"><div><p className="kicker">Ready to talk to manufacturers?</p><h2>Bring a useful inquiry</h2><p>Share product, process needs, packaging, honest volume, certifications your buyers need, and timing. Choose a profile before requesting contact help.</p></div><Link className="btn btn-gold" href="/guides/first-production-run">Prepare for outreach</Link></section>
      </div></main>
    </>
  );
}
