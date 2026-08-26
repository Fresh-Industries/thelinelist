import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { CompareShortlistControls } from "@/components/compare/CompareShortlistControls";
import { Unpublished } from "@/components/Unpublished";
import { certificationCardClaims, formatLastVerified, formatProcesses, getPlantBySlug } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";

const compareMetadata = pageMetadata({
  title: "Compare food and beverage manufacturers",
  description: "Compare up to five manufacturers using public product, process, package, minimum-order, location, and quality information.",
  path: "/find-manufacturers/compare",
});
export const metadata = { ...compareMetadata, robots: { index: false, follow: true } };

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

function PublicValues({ values }: { values: string[] }) {
  if (values.length === 0) return <Unpublished />;
  return <ul className="compare-values">{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul>;
}

function splitPublicValues(value: string | null): string[] {
  return value?.split(/;\s*/).map((item) => item.trim()).filter(Boolean) ?? [];
}

export default async function CompareManufacturersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const requested = [...new Set((first((await searchParams).plants) ?? "").split(",").map((slug) => slug.trim()).filter(Boolean))].slice(0, 5);
  const plants = requested.map(getPlantBySlug).filter((plant) => plant !== undefined);

  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <main id="main" className="wrap compare-page">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find manufacturers", href: "/find-manufacturers" }, { name: "Compare", href: "/find-manufacturers/compare" }]} />
        <header><p className="kicker">Make a confident shortlist</p><h1>Compare manufacturers</h1><p className="lede">Scan the public facts, spot what is still unknown, and decide which manufacturers are worth contacting.</p></header>
        {plants.length > 0 ? <CompareShortlistControls key={plants.map(({ slug }) => slug).join(",")} plants={plants.map(({ slug, name }) => ({ slug, name }))} /> : null}
        {plants.length < 2 ? (
          <section className="compare-empty"><h2 id="compare-empty-heading" tabIndex={-1}>{plants.length === 1 ? "Add one more manufacturer" : "Select at least two manufacturers"}</h2><p>Use the Compare button on directory cards or manufacturer profiles. Your shortlist stays in this browser until you clear it.</p><Link className="btn btn-gold" href="/find-manufacturers">Browse manufacturers</Link></section>
        ) : (
          <section className="compare-workspace" aria-labelledby="comparison-heading">
              <div className="compare-workspace-heading">
                <div><p className="kicker">Side-by-side facts</p><h2 id="comparison-heading">Where do they differ?</h2></div>
                <p id="compare-scroll-hint">Scroll sideways to see every manufacturer <span aria-hidden="true">→</span></p>
              </div>
              <div className="compare-table-wrap" tabIndex={0} aria-label="Scrollable manufacturer comparison" aria-describedby="compare-scroll-hint">
                <table className="compare-table">
                  <thead><tr><th scope="col">Compare by</th>{plants.map((plant, index) => <th scope="col" key={plant.slug}><span className="compare-column-number" aria-hidden="true">{index + 1}</span><strong>{plant.name}</strong><Link href={`/manufacturers/${plant.slug}`}>View sourced profile <span aria-hidden="true">→</span></Link></th>)}</tr></thead>
                  <tbody>
                    <tr><th scope="row">Location</th>{plants.map((plant) => <td key={plant.slug}>{plant.locationDisplay}</td>)}</tr>
                    <tr><th scope="row">Products</th>{plants.map((plant) => <td key={plant.slug}><PublicValues values={splitPublicValues(plant.productTypesPublished)} /></td>)}</tr>
                    <tr><th scope="row">Processes</th>{plants.map((plant) => <td key={plant.slug}><PublicValues values={formatProcesses(plant)} /></td>)}</tr>
                    <tr><th scope="row">Manufacturing capabilities</th>{plants.map((plant) => <td key={plant.slug}><PublicValues values={splitPublicValues(plant.manufacturingCapabilitiesPublished ?? null)} /></td>)}</tr>
                    <tr><th scope="row">Packaging</th>{plants.map((plant) => <td key={plant.slug}><PublicValues values={splitPublicValues(plant.packaging)} /></td>)}</tr>
                    <tr><th scope="row">Published minimum</th>{plants.map((plant) => <td key={plant.slug}>{plant.moqDisplay ?? <Unpublished />}</td>)}</tr>
                    <tr><th scope="row">Regulatory and quality</th>{plants.map((plant) => <td key={plant.slug}><PublicValues values={certificationCardClaims(plant)} /></td>)}</tr>
                    <tr><th scope="row">Evidence checked</th>{plants.map((plant) => <td key={plant.slug}>{plant.listingStatus === "LISTABLE" ? "Public sources checked" : "Verified"} {formatLastVerified(plant.lastVerified)}</td>)}</tr>
                  </tbody>
                </table>
              </div>
          </section>
        )}
        <section className="compare-next"><div><p className="kicker">Before you contact them</p><h2>Ask every manufacturer the same questions</h2><p>Confirm the exact facility, line, formula, package, current minimum, certifications, timing, materials, trials, and storage.</p></div><Link className="btn btn-gold" href="/guides/first-manufacturer-call">Open the first-call checklist</Link></section>
      </main>
    </>
  );
}
