import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { SourcingLanding } from "@/components/sourcing/SourcingLanding";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = {
  ...pageMetadata({
    title: "Build your product plan with your agent",
    description: "Turn a food idea into a clear product plan, evidence-backed manufacturer matches, and an approved introduction.",
    path: "/sourcing",
  }),
  robots: { index: false, follow: false },
};

export default function SourcingPage() {
  return (
    <>
      <SiteHeader current="/sourcing" />
      <main id="main" className="wrap sourcing-landing">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Your product plan", href: "/sourcing" }]} />
        <SourcingLanding />
      </main>
    </>
  );
}
