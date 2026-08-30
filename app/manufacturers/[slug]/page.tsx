import { TrackOnMount } from "@/components/analytics/TrackOnMount";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SourceLinks } from "@/components/SourceLinks";
import { Unpublished } from "@/components/Unpublished";
import { RelatedGuides } from "@/components/guides/RelatedGuides";
import { CompareButton } from "@/components/compare/CompareButton";
import { CompareDock } from "@/components/compare/CompareDock";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  OPERATION_TYPE_LABELS,
  PRODUCT_CATEGORIES,
  formatLastVerified,
  formatProcesses,
  formatVerifiedMonth,
  certificationClaimCount,
  claimSourceLabel,
  classifyCertificationClaims,
  getPlantBySlug,
  getPlantSlugs,
  plantMatchesCategory,
  processLabel,
  queryToSearchParams,
  smallRunSignalForPlant,
  stateLabel,
} from "@/lib/directory";
import { plantProfileJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { relatedGuidesForPlant } from "@/lib/guides/related";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

function normalizedSourceUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function FieldCitations({ urls, sourceNumbers }: { urls?: string[]; sourceNumbers: Map<string, number> }) {
  const numbers = [...new Set((urls ?? [])
    .map((url) => sourceNumbers.get(normalizedSourceUrl(url)))
    .filter((number): number is number => Boolean(number)))];
  if (numbers.length === 0) return null;
  return (
    <small className="field-citations">
      {numbers.length === 1 ? "Source" : "Sources"}{" "}
      {numbers.map((number, index) => (
        <span key={number}>{index > 0 ? ", " : null}<a href={`#source-${number}`} aria-label={`See source ${number}`}>{number}</a></span>
      ))}
    </small>
  );
}

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
  const isUnverifiedListing = (plant.listingStatus ?? "VERIFIED") !== "VERIFIED";
  return {
    ...pageMetadata({ title, description, path }),
    ...(plant.needsCurrentOwnershipVerification || isUnverifiedListing ? { robots: { index: false, follow: true } } : {}),
  };
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
  const links = [plant.website, ...(plant.extraLinks ?? [])].filter((link, index, all) => (
    all.findIndex((candidate) => normalizedSourceUrl(candidate.href) === normalizedSourceUrl(link.href)) === index
  ));
  const sourceNumbers = new Map(links.map((link, index) => [normalizedSourceUrl(link.href), index + 1]));
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
  const certificationGroups = classifyCertificationClaims(plant.certs);
  const smallRunSignal = smallRunSignalForPlant(plant);
  const certificationSections = [
    { label: "Regulatory status", values: certificationGroups.regulatoryStatus },
    { label: "Food-safety systems", values: certificationGroups.foodSafetySystems },
    { label: "Third-party certifications", values: certificationGroups.thirdPartyCertifications },
    { label: "Product or facility certifications", values: certificationGroups.productFacilityCertifications },
    { label: "Facility claims", values: certificationGroups.facilityClaims },
    { label: "Other published quality claims", values: certificationGroups.otherPublishedClaims },
  ].filter((section) => section.values.length > 0);

  return (
    <>
      <SiteHeader current="/find-manufacturers" />
      <TrackOnMount event={ANALYTICS_EVENTS.manufacturer_profile_viewed} props={{ slug: plant.slug }} />
      <JsonLd data={plantProfileJsonLd(plant)} />
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
              <p className="kicker">
                {plant.operationType === "shared-kitchen-incubator"
                  ? OPERATION_TYPE_LABELS[plant.operationType]
                  : "Food and beverage manufacturer"}
              </p>
              <h1>{plant.name}</h1>
              <p className="company-place">{plant.locationDisplay}</p>
              <p className={`listing-evidence listing-evidence-${plant.needsCurrentOwnershipVerification ? "review" : listingStatus.toLowerCase()}`}>
                {plant.needsCurrentOwnershipVerification
                  ? "Needs current ownership verification"
                  : listingStatus === "VERIFIED"
                  ? `Public sources reviewed ${formatVerifiedMonth(plant.lastVerified)}`
                  : "Public source listing"}
              </p>
            </div>
          </div>
          {plant.verificationNotice ? <aside className="ownership-review" role="note"><strong>Contact help is paused.</strong><p>{plant.verificationNotice}</p></aside> : null}
          <p className="meta">
            {plant.needsCurrentOwnershipVerification
              ? "This profile remains visible as a flagged public-source record while ownership and operating details are rechecked."
              : listingStatus === "VERIFIED"
              ? `The Line List checked this manufacturer against current public information on ${formatLastVerified(plant.lastVerified)}.`
              : `This listing is based on public source material checked ${formatLastVerified(plant.lastVerified)} and has not received the same verification treatment as a Verified profile.`}{" "}
            Check current fit, availability, and requirements directly with the manufacturer.
          </p>
          {smallRunSignal ? (
            <aside className="profile-small-run-signal" role="note">
              <strong>Small-run signal listed</strong>
              <p>{smallRunSignal.evidence} This is a public-source signal, not a current quote. Confirm the current minimum and line fit directly with the manufacturer.</p>
              <FieldCitations urls={smallRunSignal.sourceUrls} sourceNumbers={sourceNumbers} />
            </aside>
          ) : null}
          {!plant.introductionsPaused ? <div className="profile-contact-help">
            <Link className="btn btn-gold" href={`/find-manufacturers/request-intro?manufacturer=${plant.slug}`}>
              Request help contacting this manufacturer
            </Link>
            <p>The Line List reviews your request and follows up by email about next steps. We do not promise a direct relationship or a response from the manufacturer.</p>
          </div> : null}

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
            <div><dt>Processes</dt><dd>{processes.length > 0 ? processes.join(" · ") : <Unpublished />}<FieldCitations urls={plant.fieldSourceUrls?.processes} sourceNumbers={sourceNumbers} /></dd></div>
            <div><dt>Product types</dt><dd>{plant.productTypesPublished ?? <Unpublished />}<FieldCitations urls={plant.fieldSourceUrls?.products} sourceNumbers={sourceNumbers} /></dd></div>
            <div><dt>Manufacturing capabilities</dt><dd>{plant.manufacturingCapabilitiesPublished ?? <Unpublished />}<FieldCitations urls={plant.fieldSourceUrls?.processes} sourceNumbers={sourceNumbers} /></dd></div>
            <div><dt>Packaging</dt><dd>{plant.packaging ?? <Unpublished />}<FieldCitations urls={plant.fieldSourceUrls?.packaging} sourceNumbers={sourceNumbers} /></dd></div>
            <div><dt>Published minimum</dt><dd>{plant.moqDisplay ?? <Unpublished />}<FieldCitations urls={plant.fieldSourceUrls?.minimums} sourceNumbers={sourceNumbers} /></dd></div>
            <div><dt>Source basis</dt><dd>{claimSourceLabel(plant)}</dd></div>
            <div><dt>Operating model</dt><dd>{plant.operationType ? OPERATION_TYPE_LABELS[plant.operationType] : (plant.operationTypePublished ?? <Unpublished />)}</dd></div>
            <div><dt>Website</dt><dd><a href={plant.website.href} rel="noreferrer">Visit official website</a></dd></div>
            <div><dt>Phone</dt><dd>{plant.needsCurrentOwnershipVerification ? <Unpublished>Needs current ownership verification</Unpublished> : plant.phone ? <a href={`tel:${plant.phone}`}>{plant.phone}</a> : <Unpublished />}</dd></div>
            <div><dt>Public email</dt><dd>{plant.needsCurrentOwnershipVerification ? <Unpublished>Needs current ownership verification</Unpublished> : plant.publicEmail ? <a href={`mailto:${plant.publicEmail}`}>{plant.publicEmail}</a> : <Unpublished />}</dd></div>
          </dl>

          <section aria-labelledby="quality-heading" className="profile-quality">
            <h2 id="quality-heading">Regulatory and quality information</h2>
            <p>These terms do not all mean the same thing. Registration and inspection are regulatory statuses. HACCP and GMP describe food-safety systems. SQF and BRCGS are third-party certification programs. Confirm the current facility, scope, and expiration directly.</p>
            {certificationClaimCount(certificationGroups) > 0 ? (
              <dl className="quality-groups">
                {certificationSections.map((section) => (
                  <div key={section.label}>
                    <dt>{section.label}</dt>
                    <dd>{section.values.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            ) : <p><Unpublished>Unknown, ask the manufacturer</Unpublished></p>}
            <FieldCitations urls={plant.fieldSourceUrls?.certifications} sourceNumbers={sourceNumbers} />
          </section>

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

          <RelatedGuides guides={relatedGuidesForPlant(plant)} heading="Prepare for the next manufacturer conversation" />

          <h2>What to ask next</h2>
          <ul>{questions.map((question) => <li key={question}>{question}</li>)}</ul>

          <h2>Sources</h2>
          <p><SourceLinks links={links} numbered /></p>
          <p className="honest">A directory profile is a starting point, not an endorsement or a guarantee of fit.</p>

          <div className="profile-actions">
            {!plant.introductionsPaused ? <Link className="btn btn-gold" href={`/find-manufacturers/request-intro?manufacturer=${plant.slug}`}>
              Request help contacting this manufacturer
            </Link> : null}
            <CompareButton className="btn btn-ghost" slug={plant.slug} name={plant.name} />
          </div>
          <p className="claim-compact">
            Represent this manufacturer? <Link href={`/claim-submit?manufacturer=${plant.slug}`}>Claim or correct this profile</Link>.
          </p>
          <NewsletterCta />
        </article>
      </main>
      <CompareDock />
    </>
  );
}
