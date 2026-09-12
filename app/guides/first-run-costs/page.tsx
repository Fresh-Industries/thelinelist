import { GuideCover } from "@/components/guides/GuideCover";
import { guideArtwork } from "@/lib/guides/artwork";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { RunCostWorksheet } from "@/components/guides/RunCostWorksheet";
import { GuideByline } from "@/components/guides/GuideByline";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleJsonLd } from "@/lib/seo/jsonld";

const title = "What could your first food production run cost?";
const description = "Use your own ingredient, packaging, manufacturing, freight, and storage estimates to explore a first production run. Keep unknown costs visible and save the worksheet to your private product plan.";
export const metadata = pageMetadata({ title: "Food Production Cost Calculator | First-Run Worksheet", description, path: "/guides/first-run-costs" });

export default function FirstRunCostsPage() {
  return <><SiteHeader current="/guides" /><JsonLd data={articleJsonLd({ headline: title, description, image: guideArtwork("first-run-costs").src, path: "/guides/first-run-costs", datePublished: "2026-09-10", dateModified: "2026-09-10" })} />
    <main id="main" className="wrap founder-resource">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: "First-run costs", href: "/guides/first-run-costs" }]} />
      <header><p className="kicker">First-run cost worksheet</p><h1>{title}</h1><p className="lede">Start with your numbers. See what is included, what is still open, and how a different run size changes the estimate.</p><GuideByline reviewed="10 Sep 2026" /></header>
      <GuideCover slug="first-run-costs" />
      <div className="direct-answer"><p>A manufacturing fee is only part of the picture. Keep per-unit costs and whole-run costs separate, and confirm what each quote includes before adding it. Cost-based planning should also be checked against what customers will pay. <a href="https://extension.psu.edu/food-for-profit-price-and-pricing">Penn State’s pricing guide</a> explains these two sides of pricing.</p></div>
      <section id="checklist" aria-labelledby="worksheet-heading"><h2 id="worksheet-heading">Explore your first run</h2><RunCostWorksheet /></section>
      <section className="prose"><h2>Compare the same scope in every quote</h2><p>Ask whether a minimum is per recipe, flavor, package, or production day. Check who owns extra materials, who books freight, when storage fees begin, and whether trials or testing cost extra. Compare the same finished quantity and included services. An unanswered quote line stays unknown.</p><p><Link href="/guides/manufacturer-inquiry-examples#examples">See an annotated quote example</Link> · <Link href="/guides/food-manufacturing-moqs">Understand minimum orders</Link> · <Link href="/guides/first-production-run">Plan the first run</Link></p>
        <h2>Sources and scope</h2><ul className="source-list"><li><a href="https://extension.psu.edu/food-for-profit-price-and-pricing">Penn State Extension: Food for Profit — Price and Pricing (24 Aug 2026)</a></li><li><a href="https://extension.psu.edu/food-for-profit-price-and-pricing-worksheet">Penn State Extension: Price and Pricing Worksheet (2 Jun 2026)</a></li><li><a href="https://ask.ifas.ufl.edu/publication/FS380">UF/IFAS Extension: Finding and Using a Co-packer</a></li></ul><p className="meta">Reviewed 10 Sep 2026. An educational estimate for one run, using the amounts you enter. It does not predict supplier pricing, financing needs, or business profitability.</p>
      </section>
    </main></>;
}
