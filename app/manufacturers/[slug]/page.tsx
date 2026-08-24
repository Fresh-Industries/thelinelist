import { TrackOnMount } from "@/components/analytics/TrackOnMount";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SourceLinks } from "@/components/SourceLinks";
import { Unpublished } from "@/components/Unpublished";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  OPERATION_TYPE_LABELS,
  PRODUCT_CATEGORIES,
  formatLastVerified,
  formatProcesses,
  formatVerifiedMonth,
  getPlantBySlug,
  getPlantSlugs,
  plantMatchesCategory,
  processLabel,
  queryToSearchParams,
  stateLabel,
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
  const listingStatus = plant.listingStatus ?? "VERIFIED";
  const categories = PRODUCT_CATEGORIES.filter((category) => plantMatchesCategory(plant, category.slug));
  const states = [...new Set(plant.sites.map((site) => site.state))];
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
            <div>
              <p className="kicker">Food and beverage manufacturer</p>
              <h1>{plant.name}</h1>
              <p className="company-place">{plant.locationDisplay}</p>
              <p className={`listing-evidence listing-evidence-${listingStatus.toLowerCase()}`}>
                {listingStatus === "VERIFIED"
                  ? `Public sources reviewed ${formatVerifiedMonth(plant.lastVerified)}`
                  : "Public source listing"}
              </p>
            </div>
          </div>
          <p className="meta">
            {listingStatus === "VERIFIED"
              ? `The Line List checked this manufacturer against current public information on ${formatLastVerified(plant.lastVerified)}.`
              : `This listing is based on public source material checked ${formatLastVerified(plant.lastVerified)} and has not received the same verification treatment as a Verified profile.`}{" "}
            Check current fit, availability, and requirements directly with the manufacturer.
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
            <div><dt>Manufacturing capabilities</dt><dd>{plant.manufacturingCapabilitiesPublished ?? <Unpublished />}</dd></div>
            <div><dt>Packaging</dt><dd>{plant.packaging ?? <Unpublished />}</dd></div>
            <div><dt>Published minimum</dt><dd>{plant.moqDisplay ?? <Unpublished />}</dd></div>
            <div><dt>Certifications</dt><dd>{plant.certs.length > 0 ? plant.certs.join(" · ") : <Unpublished />}</dd></div>
            <div><dt>Operating model</dt><dd>{plant.operationType ? OPERATION_TYPE_LABELS[plant.operationType] : (plant.operationTypePublished ?? <Unpublished />)}</dd></div>
            <div><dt>Website</dt><dd><a href={plant.website.href} rel="noreferrer">Visit official website</a></dd></div>
            <div><dt>Phone</dt><dd>{plant.phone ? <a href={`tel:${plant.phone}`}>{plant.phone}</a> : <Unpublished />}</dd></div>
            <div><dt>Public email</dt><dd>{plant.publicEmail ? <a href={`mailto:${plant.publicEmail}`}>{plant.publicEmail}</a> : <Unpublished />}</dd></div>
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

          {categories.length > 0 || states.length > 0 || plant.finderProcesses.length > 0 ? (
            <section aria-labelledby="related-discovery-heading">
              <h2 id="related-discovery-heading">Explore related manufacturers</h2>
              <ul className="profile-related-links">
                {categories.map((category) => (
                  <li key={category.slug}><Link href={`/find-manufacturers/${category.slug}`}>{category.label}</Link></li>
                ))}
                {states.map((state) => (
                  <li key={state}><Link href={`/find-manufacturers?${queryToSearchParams({ state })}`}>{stateLabel(state)} manufacturers</Link></li>
                ))}
                {plant.finderProcesses.map((process) => (
                  <li key={process}><Link href={`/find-manufacturers?${queryToSearchParams({ process })}`}>{processLabel(process)} manufacturers</Link></li>
                ))}
              </ul>
            </section>
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
