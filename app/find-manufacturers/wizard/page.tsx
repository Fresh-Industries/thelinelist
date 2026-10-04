import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MatchingWizard } from "@/components/MatchingWizard";
import { SiteHeader } from "@/components/SiteHeader";
import { getProductCategory, parseDirectoryQuery, verifiedStates } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = pageMetadata({ title: "Manufacturer Matching Wizard", description: "Find food and beverage manufacturers in three short steps, with optional package, process, location, certification, and small-run filters.", path: "/find-manufacturers/wizard", absoluteTitle: true });

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function WizardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = parseDirectoryQuery(params);
  // Product hubs previously linked with ?product=<category>; keep those entries working.
  const legacyProduct = getProductCategory(first(params.product));
  if (!query.category && legacyProduct) query.category = legacyProduct.slug;
  const initialUnsure = first(params.unsure) === "1";
  const requestedStep = Number(first(params.step));
  const initialStep = query.category || initialUnsure ? (requestedStep === 2 || requestedStep === 3 ? requestedStep : 1) : 1;
  return <><SiteHeader current="/find-manufacturers" /><main id="main"><div className="wrap wizard-page"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find manufacturers", href: "/find-manufacturers" }, { name: "Matching wizard", href: "/find-manufacturers/wizard" }]} /><div className="wizard-page-head"><div><p className="kicker">Three short steps</p><h1>Find manufacturers for what you want to make</h1><p className="lede">Start with your product. Skip anything you do not know. No account or contact details needed to see results.</p></div><Image src="/images/clay-v2/support/beginner-onboarding.webp" alt="Clay product brief with bottle, jar, can, and question-mark props" width={640} height={640} sizes="(max-width: 760px) 55vw, 18rem" priority /></div><MatchingWizard states={verifiedStates()} initialQuery={query} initialStep={initialStep} initialUnsure={initialUnsure} /></div></main></>;
}
