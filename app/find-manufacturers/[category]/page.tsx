import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopackerCard } from "@/components/CopackerCard";
import { JsonLd } from "@/components/JsonLd";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustStrip } from "@/components/TrustStrip";
import { CATEGORY_HUB_CONTENT, PRODUCT_CATEGORIES, filterPlants, getProductCategory } from "@/lib/directory";
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
  return pageMetadata({ title: content.seoTitle, description: content.description, path: `/find-manufacturers/${entry.slug}`, absoluteTitle: true });
}

export default async function ProductHubPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const entry = getProductCategory(category);
  if (!entry) notFound();
  const content = CATEGORY_HUB_CONTENT[entry.slug];
  const plants = filterPlants({ category: entry.slug });
  const faqs = [
    { question: content.questions[0], answer: "Use the public capability details as a starting point, then confirm formula, process, equipment, and timing directly with the manufacturer." },
    { question: content.questions[1], answer: "Packaging and minimum runs vary by line. If a listing does not publish the answer, The Line List labels it as not publicly listed." },
  ];
  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <JsonLd data={collectionPageJsonLd({ name: content.h1, description: content.description, path: `/find-manufacturers/${entry.slug}`, plants })} />
      <JsonLd data={faqPageJsonLd(faqs)} />
      <main id="main"><div className="wrap product-hub category-page">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find manufacturers", href: "/find-manufacturers" }, { name: entry.label, href: `/find-manufacturers/${entry.slug}` }]} />
        <p className="kicker">{entry.label}</p><h1>{content.h1}</h1><p className="lede">{content.description}</p>
        <div className="cta-band"><Link className="btn btn-gold" href={`/find-manufacturers/wizard?product=${entry.slug}`}>Match this product</Link><Link className="btn btn-ghost" href="/find-manufacturers">Use all filters</Link></div>
        <p className="honest">These results use disclosed product language only. Not listed does not mean incapable. It means you should ask. <Link href="/how-we-verify">How we verify</Link></p>
        <div className="results-head"><p>{plants.length > 0 ? `Manufacturers that publicly mention ${entry.label.toLowerCase()}` : `No manufacturers publicly mention ${entry.label.toLowerCase()} yet`}</p></div>
        {plants.length > 0 ? <div className="card-grid">{plants.map((plant) => <CopackerCard key={plant.slug} plant={plant} />)}</div> : <section className="empty-results"><Image src="/images/clay-v2/support/empty-results.webp" alt="Clay sample box and magnifying glass" width={640} height={640} sizes="18rem" /><div><h2>No stated matches yet</h2><p>We will not infer this product capability from a broad beverage or food tag. Try the wizard, broaden to the directory, or use the guide path to prepare questions.</p><div className="cta-band"><Link className="btn btn-gold" href="/find-manufacturers/wizard">Use the wizard</Link><Link className="btn btn-ghost" href="/guides">Browse guides</Link></div></div></section>}
        <section className="product-faq" aria-labelledby="product-faq-heading"><p className="kicker">Questions to ask</p><h2 id="product-faq-heading">Before you choose a line</h2>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
        <TrustStrip />
      </div></main>
    </>
  );
}
