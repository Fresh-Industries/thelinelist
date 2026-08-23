import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { SiteHeader } from "@/components/SiteHeader";
import { isNewsletterEnabled } from "@/lib/newsletter/config";
import { pageMetadata } from "@/lib/seo/metadata";
import Image from "next/image";

export const metadata = pageMetadata({ title: "The Line List newsletter", description: "Plain-language food and beverage manufacturing guides, preparation notes, and directory updates.", path: "/newsletter" });

export default function NewsletterPage() {
  const enabled = isNewsletterEnabled();
  return <><SiteHeader current="/newsletter" /><main id="main" className="wrap newsletter-page"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Newsletter", href: "/newsletter" }]} /><div className="newsletter-hero"><div><p className="kicker">The Line List newsletter</p><h1>Better prepared for the next manufacturer conversation</h1><p className="lede">Get plain-language process explanations, preparation checklists, and newly reviewed directory listings.</p><ul><li>Product and packaging decisions</li><li>Questions to ask manufacturers</li><li>New and updated guides</li></ul>{enabled ? <NewsletterForm /> : <p className="honest">Subscriptions are not open right now. You can still use every guide and directory page.</p>}</div><Image src="/images/clay-v2/support/newsletter.webp" alt="Clay envelope with product specification cards, a pencil, and a paper clip" width={640} height={640} sizes="(max-width: 760px) 100vw, 48vw" priority /></div></main></>;
}
