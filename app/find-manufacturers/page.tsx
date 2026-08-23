import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopackerCard } from "@/components/CopackerCard";
import { DirectoryFilters, DirectoryResultsBar } from "@/components/DirectoryFilters";
import { JsonLd } from "@/components/JsonLd";
import { SiteHeader } from "@/components/SiteHeader";
import { collectionPageJsonLd } from "@/lib/seo/jsonld";
import {
  filterPlants,
  getProductCategory,
  parseDirectoryQuery,
  queryToSearchParams,
  verifiedStates,
  type ProductCategorySlug,
} from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const title = "Find a Manufacturer for Your Product";
const description = "Browse food and beverage manufacturers by product and location, then use optional filters for publicly sourced capabilities.";

const FEATURED_CATEGORIES: ProductCategorySlug[] = [
  "energy-drink",
  "soda",
  "juice",
  "hot-sauce",
  "sauce",
  "rtd-coffee-tea",
  "dips-hummus",
  "prepared-refrigerated-foods",
];

export const metadata: Metadata = pageMetadata({ title, description, path: "/find-manufacturers", absoluteTitle: true });

export default async function FindManufacturersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseDirectoryQuery(await searchParams);
  const plants = filterPlants(query);
  const filterKey = queryToSearchParams(query).toString() || "all";
  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <JsonLd data={collectionPageJsonLd({ name: title, description, path: "/find-manufacturers", plants })} />
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
        <nav className="directory-categories" aria-label="Browse popular product categories">
          <div>
            <p className="kicker">Browse by product</p>
            <h2>Popular categories</h2>
          </div>
          <ul>
            {FEATURED_CATEGORIES.map((slug) => {
              const category = getProductCategory(slug);
              return category ? <li key={slug}><Link href={`/find-manufacturers/${slug}`}>{category.label} <span aria-hidden="true">↗</span></Link></li> : null;
            })}
          </ul>
        </nav>
        <DirectoryResultsBar initial={query} resultCount={plants.length} />
        <p className="directory-trust-line">Listings are based on publicly available information. Inclusion isn’t an endorsement. <Link href="/how-we-verify">How we verify <span aria-hidden="true">→</span></Link></p>
        {plants.length > 0 ? <div className="card-grid">{plants.map((plant) => <CopackerCard key={plant.slug} plant={plant} />)}</div> : <section className="empty-results"><Image src="/images/clay-v2/support/empty-results.webp" alt="Clay sample box and magnifying glass" width={640} height={640} sizes="18rem" /><div><h2>No plants match these filters yet</h2><p>That can mean the directory has no stated capability for this mix, or the relevant fields are not public. We will not turn an unknown into a match.</p><div className="cta-band"><Link className="btn btn-gold" href="/find-manufacturers">Clear filters</Link><Link className="btn btn-ghost" href="/guides">Read a related guide</Link></div></div></section>}
        <section className="shortlist-band"><div><p className="kicker">Ready to talk to manufacturers?</p><h2>Bring a useful inquiry</h2><p>Share product, process needs, packaging, honest volume, certifications your buyers need, and timing. Choose a profile before requesting an introduction.</p></div><Link className="btn btn-gold" href="/guides/first-production-run">Prepare for outreach</Link></section>
      </div></main>
    </>
  );
}
