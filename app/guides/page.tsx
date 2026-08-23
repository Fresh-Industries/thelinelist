import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { CORNERSTONE_GUIDES } from "@/lib/guides/cornerstones";
import { pageMetadata } from "@/lib/seo/metadata";
import Image from "next/image";
import Link from "next/link";

export const metadata = pageMetadata({ title: "Food and beverage manufacturing guides", description: "Beginner guides for finding a manufacturer, choosing a process and package, and preparing a first production run.", path: "/guides" });

export default function GuidesPage() {
  return <><SiteHeader current="/guides" /><main id="main" className="wrap guides-index"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }]} /><header className="section-intro"><p className="kicker">Learn the process</p><h1>Start with what you want to make</h1><p className="lede">Learn the decisions behind formula, process, packaging, and a first run before you contact a manufacturer.</p></header><div className="guide-card-grid">{CORNERSTONE_GUIDES.map((guide) => <article className="guide-card" key={guide.slug}><Image src={guide.image} alt="" width={800} height={520} sizes="(max-width: 760px) 100vw, 50vw" /><div><p className="kicker">{guide.eyebrow}</p><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.description}</p><Link href={`/guides/${guide.slug}`}>Read the guide <span aria-hidden="true">→</span></Link></div></article>)}</div><section className="supporting-guides"><h2>Process and planning explainers</h2><div className="text-link-grid"><Link href="/guides/hpp">HPP</Link><Link href="/guides/hot-fill">Hot fill</Link><Link href="/guides/retort">Retort</Link><Link href="/guides/small-moq">Minimum runs</Link></div></section><NewsletterCta /></main></>;
}
