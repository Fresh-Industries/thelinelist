import { Breadcrumbs } from "@/components/Breadcrumbs";
import { IntroForm } from "@/components/forms/IntroForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getPlantBySlug } from "@/lib/directory";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  ...pageMetadata({
  title: "Request a manufacturer introduction",
  description: "Send a focused introduction request after you choose a manufacturer.",
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
          { name: "Request an introduction", href: `/find-manufacturers/request-intro?manufacturer=${plant.slug}` },
        ]} />
        <p className="kicker">Introduction request</p>
        <h1>Request an introduction to {plant.name}</h1>
        <p className="lede">A few focused details help make the request useful. You can choose “Not sure” where you are still learning.</p>
        <IntroForm manufacturerSlug={plant.slug} manufacturerName={plant.name} sourceUrl={`/manufacturers/${plant.slug}`} />
        <p><Link href={`/manufacturers/${plant.slug}`}>Back to the manufacturer profile</Link></p>
      </main>
    </>
  );
}
