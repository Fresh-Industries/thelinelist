import { TrackOnMount } from "@/components/analytics/TrackOnMount";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SourceLinks } from "@/components/SourceLinks";
import { Unpublished } from "@/components/Unpublished";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  formatLastVerified,
  formatProcesses,
  getPlantBySlug,
  getPlantSlugs,
} from "@/lib/directory";
import { plantOrganizationJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPlantSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const plant = getPlantBySlug(slug);
  if (!plant) return { title: "Manufacturer not found" };
  const title = `${plant.name} | Food and beverage manufacturer`;
  const description = `Public manufacturing details for ${plant.name} in ${plant.locationDisplay}, with source links and questions to ask.`;
  const path = `/manufacturers/${plant.slug}`;
  return pageMetadata({ title, description, path });
}

export default async function ManufacturerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plant = getPlantBySlug(slug);
  if (!plant) notFound();

  const processes = formatProcesses(plant);
  const links = [plant.website, ...(plant.extraLinks ?? [])];
  const fitReasons = [
    plant.productTypesPublished ? `Products: ${plant.productTypesPublished}` : null,
    processes.length > 0 ? `Processes: ${processes.join(", ")}` : null,
    plant.packaging ? `Packaging: ${plant.packaging}` : null,
  ].filter((item): item is string => Boolean(item));
  const questions = [
    !plant.moqDisplay ? "What is the current minimum run for this product and package?" : null,
    plant.certs.length === 0 ? "Which certifications apply to the facility and line I would use?" : null,
    !plant.packaging ? "Which package formats and sizes can this line run?" : null,
    "Is my formula, storage plan, and expected shelf life compatible with your process?",
    "What documents and test results do you need before a first run?",
  ].filter((item): item is string => Boolean(item));

  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <TrackOnMount event={ANALYTICS_EVENTS.manufacturer_profile_viewed} props={{ slug: plant.slug }} />
      <JsonLd data={plantOrganizationJsonLd(plant)} />
      <main id="main">
        <article className="prose wrap company-page profile-page">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Find manufacturers", href: "/find-manufacturers" },
              { name: plant.name, href: `/manufacturers/${plant.slug}` },
            ]}
          />

          <div className="profile-heading">
            <div className="profile-monogram" aria-hidden="true">{plant.name.charAt(0)}</div>
            <div>
              <p className="kicker">Food and beverage manufacturer</p>
              <h1>{plant.name}</h1>
              <p className="company-place">{plant.locationDisplay}</p>
            </div>
          </div>
          <p className="meta">
            Public details reviewed {formatLastVerified(plant.lastVerified)}. Check current fit,
            availability, and requirements directly with the manufacturer.
          </p>
          <p>
            <Link className="btn btn-gold" href={`/find-manufacturers/request-intro?manufacturer=${plant.slug}`}>
              Request an introduction
            </Link>
          </p>

          <section aria-labelledby="fit-heading">
            <h2 id="fit-heading">Why it may fit</h2>
            {fitReasons.length > 0 ? (
              <ul>{fitReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            ) : (
              <p>The public pages do not list enough detail to assess product fit yet.</p>
            )}
          </section>

          <dl className="company-facts">
            <div><dt>Location</dt><dd>{plant.locationDisplay}</dd></div>
            <div><dt>Processes</dt><dd>{processes.length > 0 ? processes.join(" · ") : <Unpublished />}</dd></div>
            <div><dt>Product types</dt><dd>{plant.productTypesPublished ?? <Unpublished />}</dd></div>
            <div><dt>Packaging</dt><dd>{plant.packaging ?? <Unpublished />}</dd></div>
            <div><dt>Published minimum</dt><dd>{plant.moqDisplay ?? <Unpublished />}</dd></div>
            <div><dt>Certifications</dt><dd>{plant.certs.length > 0 ? plant.certs.join(" · ") : <Unpublished />}</dd></div>
          </dl>

          <h2>What the manufacturer says</h2>
          {plant.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

          {plant.sites.length > 0 ? (
            <>
              <h2>Publicly listed locations</h2>
              <ul className="site-list">
                {plant.sites.map((site) => (
                  <li key={`${site.city ?? "not-listed"}-${site.state}-${site.note ?? ""}`}>
                    {site.city ? `${site.city}, ${site.state}` : `${site.state} (city not publicly listed)`}
                    {site.note ? ` — ${site.note}` : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2>What to ask next</h2>
          <ul>{questions.map((question) => <li key={question}>{question}</li>)}</ul>

          <h2>Sources</h2>
          <p><SourceLinks links={links} /></p>
          <p className="honest">A directory profile is a starting point, not an endorsement or a guarantee of fit.</p>

          <div className="profile-actions">
            <Link className="btn btn-gold" href={`/find-manufacturers/request-intro?manufacturer=${plant.slug}`}>
              Request an introduction
            </Link>
            <Link className="btn btn-ghost" href="/find-manufacturers">Compare manufacturers</Link>
          </div>
          <p className="claim-compact">
            Represent this manufacturer? <Link href={`/claim-submit?manufacturer=${plant.slug}`}>Claim or correct this profile</Link>.
          </p>
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}
