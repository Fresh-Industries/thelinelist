import { Breadcrumbs } from "@/components/Breadcrumbs";
import { IntroForm } from "@/components/forms/IntroForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getPlantBySlug } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  ...pageMetadata({
  title: "Request help contacting a manufacturer",
  description: "Send a focused contact-help request after you choose a manufacturer.",
  path: "/find-manufacturers/request-intro",
  }),
  robots: { index: false, follow: true },
};

export default async function RequestIntroPage({
  searchParams,
}: {
  searchParams: Promise<{ manufacturer?: string }>;
}) {
  const { manufacturer } = await searchParams;
  if (!manufacturer) notFound();
  const plant = getPlantBySlug(manufacturer);
  if (!plant) notFound();

  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <main id="main" className="wrap prose intro-request-page form-page">
        <Breadcrumbs items={[
          { name: "Home", href: "/" },
          { name: "Find manufacturers", href: "/find-manufacturers" },
          { name: plant.name, href: `/manufacturers/${plant.slug}` },
          { name: "Request contact help", href: `/find-manufacturers/request-intro?manufacturer=${plant.slug}` },
        ]} />
        <p className="kicker">Manufacturer contact help</p>
        <h1>Request help contacting {plant.name}</h1>
        {plant.introductionsPaused ? (
          <aside className="ownership-review" role="note">
            <strong>Contact help is paused for this profile.</strong>
            <p>{plant.verificationNotice ?? "The current operating entity and contact details need verification before requests resume."}</p>
          </aside>
        ) : (
          <>
            <p className="lede">A few focused details help us review the request. The Line List follows up by email about possible next steps; we do not promise a direct relationship or a response from the manufacturer.</p>
            <IntroForm manufacturerSlug={plant.slug} manufacturerName={plant.name} sourceUrl={`/manufacturers/${plant.slug}`} />
          </>
        )}
        <p><Link href={`/manufacturers/${plant.slug}`}>Back to the manufacturer profile</Link></p>
      </main>
    </>
  );
}
