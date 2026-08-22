import { TrackOnMount } from "@/components/analytics/TrackOnMount";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClaimBand } from "@/components/ClaimBand";
import { IntroModule } from "@/components/IntroModule";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterCta } from "@/components/NewsletterCta";
import { SiteHeader } from "@/components/SiteHeader";
import { SourceLinks } from "@/components/SourceLinks";
import { SponsoredSlot } from "@/components/ads/SponsoredSlot";
import { Unpublished } from "@/components/Unpublished";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  claimPlantOptions,
  formatLastVerified,
  formatProcesses,
  formatProductTypes,
  getPlantBySlug,
  getPlantSlugs,
} from "@/lib/directory";
import { plantOrganizationJsonLd } from "@/lib/seo/jsonld";
import { SITE_NAME } from "@/lib/site";
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
  if (!plant) {
    return { title: "Company not found" };
  }
  const title = `${plant.name} | U.S. manufacturer`;
  const description = `${plant.name} in ${plant.locationDisplay}. Plant-site-verified facts. Request an intro when they look like a fit.`;
  const path = `/copackers/${plant.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
    },
    twitter: {
      card: "summary",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plant = getPlantBySlug(slug);
  if (!plant) notFound();

  const processes = formatProcesses(plant);
  const products = formatProductTypes(plant);
  const links = [plant.website, ...(plant.extraLinks ?? [])];
  const firstSite = plant.sites[0];
  const claimPreset = {
    slug: plant.slug,
    name: plant.name,
    city: firstSite?.city ?? "",
    state: firstSite?.state ?? "",
  };

  return (
    <>
      <SiteHeader current="/copackers" />
      <TrackOnMount
        event={ANALYTICS_EVENTS.manufacturer_profile_viewed}
        props={{ slug: plant.slug }}
      />
      <JsonLd data={plantOrganizationJsonLd(plant)} />
      <main id="main">
        <article className="prose wrap company-page">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Find manufacturers", href: "/copackers" },
              { name: plant.name, href: `/copackers/${plant.slug}` },
            ]}
          />
          <p className="kicker">
            <Link href="/copackers">Find manufacturers</Link>
          </p>
          <h1>{plant.name}</h1>
          <p className="meta">
            Last verified {formatLastVerified(plant.lastVerified)}. Facts from the plant&apos;s own
            site. Minimum order only when they printed one.
          </p>
          <p className="company-place">{plant.locationDisplay}</p>

          <p>
            <a className="btn btn-gold" href="#intro">
              Request an introduction
            </a>
          </p>

          <dl className="company-facts">
            <div>
              <dt>Location</dt>
              <dd>{plant.locationDisplay}</dd>
            </div>
            <div>
              <dt>Processes</dt>
              <dd>{processes.length > 0 ? processes.join(" · ") : <Unpublished />}</dd>
            </div>
            <div>
              <dt>Product types</dt>
              <dd>
                {products.length > 0
                  ? products.join(" · ")
                  : plant.productTypesPublished ?? <Unpublished />}
              </dd>
            </div>
            <div>
              <dt>Packaging</dt>
              <dd>{plant.packaging ?? <Unpublished />}</dd>
            </div>
            <div>
              <dt>Published MOQ</dt>
              <dd>{plant.moqDisplay ?? <Unpublished />}</dd>
            </div>
            <div>
              <dt>Certs</dt>
              <dd>{plant.certs.length > 0 ? plant.certs.join(" · ") : <Unpublished />}</dd>
            </div>
          </dl>

          <h2>Overview</h2>
          {plant.overview.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          {plant.sites.length > 0 ? (
            <>
              <h2>Published sites</h2>
              <ul className="site-list">
                {plant.sites.map((site) => (
                  <li key={`${site.city ?? "city-unpublished"}-${site.state}-${site.note ?? ""}`}>
                    {site.city ? `${site.city}, ${site.state}` : `${site.state} (city unpublished)`}
                    {site.note ? ` (${site.note})` : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2>Website</h2>
          <p>
            <SourceLinks links={links} />
          </p>
          <p>
            We do not publish a phone or email here. If the plant did not print contact details on
            the pages we fetched, the field stays unpublished.
          </p>

          {plant.notes && plant.notes.length > 0 ? (
            <>
              <h2>Notes</h2>
              {plant.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </>
          ) : null}

          <h2>Seen on</h2>
          <p>
            {plant.appearedOn.map((guide, index) => (
              <span key={guide}>
                {index > 0 ? " · " : null}
                <Link href={`/guides/${guide}`}>{guideLabel(guide)}</Link>
              </span>
            ))}
          </p>

          <IntroModule slug={plant.slug} name={plant.name} />
          <ClaimBand plants={claimPlantOptions()} preset={claimPreset} withForm />
          <SponsoredSlot position="company" />
          <NewsletterCta />
        </article>
      </main>
    </>
  );
}

function guideLabel(guide: "hpp" | "hot-fill" | "retort" | "small-moq" | "sauce"): string {
  switch (guide) {
    case "hpp":
      return "HPP";
    case "hot-fill":
      return "Hot fill";
    case "retort":
      return "Retort";
    case "small-moq":
      return "Small MOQ";
    case "sauce":
      return "Sauces";
    default: {
      const _exhaustive: never = guide;
      return _exhaustive;
    }
  }
}
