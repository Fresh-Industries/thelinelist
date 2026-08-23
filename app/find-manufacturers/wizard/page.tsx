import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MatchingWizard } from "@/components/MatchingWizard";
import { SiteHeader } from "@/components/SiteHeader";
import { verifiedStates } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = pageMetadata({ title: "Manufacturer Matching Wizard", description: "Answer a few plain questions about your food or beverage product, packaging, process needs, location, and timing.", path: "/find-manufacturers/wizard", absoluteTitle: true });

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function WizardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <><SiteHeader current="/find-manufacturers" /><main id="main"><div className="wrap wizard-page"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Find manufacturers", href: "/find-manufacturers" }, { name: "Matching wizard", href: "/find-manufacturers/wizard" }]} /><div className="wizard-page-head"><div><p className="kicker">A few short questions</p><h1>Find manufacturers for what you want to make</h1><p className="lede">Everyday words. Skip anything you do not know. You will see useful results before we ask for contact details.</p></div><Image src="/images/clay-v2/support/beginner-onboarding.webp" alt="Clay product brief with bottle, jar, can, and question-mark props" width={640} height={640} sizes="(max-width: 760px) 55vw, 18rem" priority /></div><MatchingWizard states={verifiedStates()} initialProduct={first(params.product)} /></div></main></>;
}
