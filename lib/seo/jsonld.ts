import type { Plant } from "@/lib/directory";
import { absoluteUrl, PARENT_ORG, SITE_EMAIL, SITE_NAME } from "@/lib/site";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    "@id": `${absoluteUrl()}#organization`,
    url: absoluteUrl(),
    logo: absoluteUrl("/brand/line-list-mark.png"),
    email: SITE_EMAIL,
    parentOrganization: {
      "@type": "Organization",
      name: PARENT_ORG,
    },
    description:
      "Food and beverage manufacturer directory and beginner guides. Inclusion is not an endorsement.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    "@id": `${absoluteUrl()}#website`,
    url: absoluteUrl(),
    publisher: {
      "@id": `${absoluteUrl()}#organization`,
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : absoluteUrl(item.href),
    })),
  };
}

export function itemListJsonLd(plants: Plant[], startPosition = 1) {
  return {
    "@type": "ItemList",
    name: "Food and beverage manufacturers",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: plants.length,
    itemListElement: plants.map((plant, index) => ({
      "@type": "ListItem",
      position: startPosition + index,
      url: absoluteUrl(`/manufacturers/${plant.slug}`),
      name: plant.name,
    })),
  };
}

export function collectionPageJsonLd({
  name,
  description,
  path,
  plants,
  startPosition = 1,
}: {
  name: string;
  description: string;
  path: string;
  plants: Plant[];
  startPosition?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    ...(plants.length > 0 ? { mainEntity: itemListJsonLd(plants, startPosition) } : {}),
  };
}

export function articleJsonLd({
  headline,
  description,
  path,
  image,
  datePublished,
  dateModified,
}: {
  headline: string;
  description: string;
  path: string;
  image: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    dateModified,
    mainEntityOfPage: absoluteUrl(path),
    image: absoluteUrl(image),
    author: { "@id": `${absoluteUrl()}#organization` },
    publisher: { "@id": `${absoluteUrl()}#organization` },
  };
}

export function faqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function plantProfileJsonLd(plant: Plant) {
  const profileUrl = absoluteUrl(`/manufacturers/${plant.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${plant.name} manufacturer profile`,
    url: profileUrl,
    dateModified: plant.lastVerified,
    mainEntity: {
      "@type": "Organization",
      "@id": `${profileUrl}#manufacturer`,
      name: plant.name,
      url: profileUrl,
      sameAs: [plant.website.href],
      ...(!plant.needsCurrentOwnershipVerification && plant.phone ? { telephone: plant.phone } : {}),
      ...(!plant.needsCurrentOwnershipVerification && plant.publicEmail ? { email: plant.publicEmail } : {}),
      ...(plant.productTypesPublished ? { description: plant.productTypesPublished } : {}),
      address: plant.sites.map((site) => ({
        "@type": "PostalAddress",
        addressLocality: site.city ?? undefined,
        addressRegion: site.state,
        addressCountry: "US",
      })),
    },
  };
}
