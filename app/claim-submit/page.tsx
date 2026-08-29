import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SiteHeader } from "@/components/SiteHeader";
import { ClaimForm } from "@/components/forms/ClaimForm";
import { claimPlantOptions } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Claim or Submit a Plant",
  description: "Claim a manufacturer profile or submit a food and beverage manufacturer for manual review.",
  path: "/claim-submit",
});

export default async function ClaimSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ manufacturer?: string }>;
}) {
  const plants = claimPlantOptions();
  const { manufacturer } = await searchParams;
  const preset = plants.find((plant) => plant.slug === manufacturer);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <article className="prose wrap form-page">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Claim or submit", href: "/claim-submit" }]} />
          <p className="kicker">For manufacturers</p>
          <h1>Claim or submit a plant</h1>
          <p className="lede">Help us correct an existing profile or review a food and beverage manufacturer we have missed. Submissions are reviewed before publication.</p>
          <p className="honest">A submission is not an endorsement or a paid ranking. Link the public pages that support each capability.</p>
          <p className="claim-compact">Want the full overview? <Link href="/for-manufacturers">See how The Line List works with manufacturers</Link>.</p>
          <ClaimForm plants={plants} preset={preset} />
        </article>
      </main>
    </>
  );
}
