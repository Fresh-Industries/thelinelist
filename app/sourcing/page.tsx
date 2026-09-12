import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { SourcingLanding } from "@/components/sourcing/SourcingLanding";
import { pageMetadata } from "@/lib/seo/metadata";
import { getCornerstoneGuide } from "@/lib/guides/cornerstones";

export const metadata = {
  ...pageMetadata({
    title: "Start your food or drink brand | Your product plan",
    description: "Turn a food idea into a clear product plan, evidence-backed manufacturer matches, and an approved introduction.",
    path: "/sourcing",
  }),
  robots: { index: false, follow: false },
};

export default async function SourcingPage({ searchParams }: { searchParams: Promise<{ guide?: string | string[] }> }) {
  const query = await searchParams;
  const slug = typeof query.guide === "string" ? query.guide : "";
  const guide = getCornerstoneGuide(slug);
  const returnGuide = guide ? { slug: guide.slug, title: guide.title } : slug === "first-run-costs" ? { slug, title: "your first-run cost worksheet" } : undefined;
  return (
    <>
      <SiteHeader current="/sourcing" />
      <main id="main" className="wrap sourcing-landing">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Your product plan", href: "/sourcing" }]} />
        <SourcingLanding returnGuide={returnGuide} />
      </main>
    </>
  );
}
