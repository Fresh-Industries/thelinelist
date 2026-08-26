import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopackerCard } from "@/components/CopackerCard";
import { CompareDock } from "@/components/compare/CompareDock";
import { JsonLd } from "@/components/JsonLd";
import { JumpToManufacturers } from "@/components/JumpToManufacturers";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustStrip } from "@/components/TrustStrip";
import { CATEGORY_HUB_CONTENT, PRODUCT_CATEGORIES, categoryFaqs, categorySnapshot, filterPlants, getProductCategory, isPlantIndexable } from "@/lib/directory";
import { collectionPageJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() { return PRODUCT_CATEGORIES.map(({ slug }) => ({ category: slug })); }

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const entry = getProductCategory(category);
  if (!entry) return { title: "Product not found" };
  const content = CATEGORY_HUB_CONTENT[entry.slug];
  const indexable = filterPlants({ category: entry.slug }).some(isPlantIndexable);
  return {
    ...pageMetadata({ title: content.seoTitle, description: content.description, path: `/find-manufacturers/${entry.slug}`, absoluteTitle: true }),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ProductHubPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const entry = getProductCategory(category);
  if (!entry) notFound();
  const content = CATEGORY_HUB_CONTENT[entry.slug];
  const plants = filterPlants({ category: entry.slug });
  const faqs = categoryFaqs(entry.slug);
  const snapshot = categorySnapshot(plants);
  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <JsonLd data={collectionPageJsonLd({ name: content.h1, description: content.description, path: `/find-manufacturers/${entry.slug}`, plants: plants.filter(isPlantIndexable) })} />
      <JsonLd data={faqPageJsonLd(faqs)} />
      <main id="main"><div className="wrap product-hub category-page">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find manufacturers", href: "/find-manufacturers" }, { name: entry.label, href: `/find-manufacturers/${entry.slug}` }]} />
        <p className="kicker">{entry.label}</p><h1>{content.h1}</h1><p className="lede">{content.description}</p>
        <div className="cta-band"><Link className="btn btn-gold" href={`/find-manufacturers/wizard?product=${entry.slug}`}>Match this product</Link><Link className="btn btn-ghost" href="/find-manufacturers">Use all filters</Link><JumpToManufacturers /></div>
        <p className="honest">These results use disclosed product language only. Not listed does not mean incapable. It means you should ask. <Link href="/how-we-verify">How we verify</Link></p>
        <section className="category-snapshot" aria-labelledby="category-snapshot-heading">
          <div className="category-snapshot-heading">
            <div><p className="kicker">Directory snapshot</p><h2 id="category-snapshot-heading">What the current listings show</h2></div>
            <p><strong>Public sources reviewed</strong> {snapshot.lastReviewed}</p>
          </div>
          <dl>
            <div><dt>Matching manufacturers</dt><dd>{snapshot.matchingManufacturers}</dd></div>
            <div><dt>Comparable published minimums</dt><dd>{snapshot.publishingMinimums}</dd></div>
            <div><dt>Comparable MOQ range</dt><dd>{snapshot.comparableMoqRange ?? "No comparable unit range yet"}</dd></div>
            <div><dt>Common processes</dt><dd>{snapshot.commonProcesses.length > 0 ? snapshot.commonProcesses.join(" · ") : "Not publicly listed"}</dd></div>
            <div><dt>Common packaging</dt><dd>{snapshot.commonPackaging.length > 0 ? snapshot.commonPackaging.join(" · ") : "Not publicly listed"}</dd></div>
            <div><dt>States represented</dt><dd>{snapshot.states.length > 0 ? `${snapshot.states.length}: ${snapshot.states.join(", ")}` : "None yet"}</dd></div>
          </dl>
          <p>MOQ figures are compared only when the published units match. Other minimums remain visible on individual profiles.</p>
        </section>
        <div className="category-results-heading"><p className="kicker">Manufacturer results</p><h2 id="manufacturer-results-heading" tabIndex={-1}>{plants.length > 0 ? `${plants.length} ${plants.length === 1 ? "manufacturer" : "manufacturers"} that publicly mention ${entry.label.toLowerCase()}` : `No manufacturers publicly mention ${entry.label.toLowerCase()} yet`}</h2></div>
        {plants.length > 0 ? <div className="card-grid">{plants.map((plant) => <CopackerCard key={plant.slug} plant={plant} prioritizedCategory={entry.slug} />)}</div> : <section className="empty-results"><Image src="/images/clay-v2/support/empty-results.webp" alt="Clay sample box and magnifying glass" width={640} height={640} sizes="18rem" /><div><h2>No stated matches yet</h2><p>We will not infer this product capability from a broad beverage or food tag. Try the wizard, broaden to the directory, or use the guide path to prepare questions.</p><div className="cta-band"><Link className="btn btn-gold" href="/find-manufacturers/wizard">Use the wizard</Link><Link className="btn btn-ghost" href="/guides">Browse guides</Link></div></div></section>}
        <section className="product-faq" aria-labelledby="product-faq-heading"><p className="kicker">Questions to ask</p><h2 id="product-faq-heading">Before you choose a line</h2>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
        <TrustStrip />
      </div></main>
      <CompareDock />
    </>
  );
}
