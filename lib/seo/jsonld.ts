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

export function itemListJsonLd(plants: Plant[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Food and beverage manufacturers",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: plants.map((plant, index) => ({
      "@type": "ListItem",
      position: index + 1,
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
}: {
  name: string;
  description: string;
  path: string;
  plants: Plant[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    ...(plants.length > 0 ? { mainEntity: itemListJsonLd(plants) } : {}),
  };
}

export function articleJsonLd({
  headline,
  description,
  path,
  image,
  dateModified,
}: {
  headline: string;
  description: string;
  path: string;
  image: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
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

export function plantOrganizationJsonLd(plant: Plant) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: plant.name,
    url: plant.website.href,
    address: plant.sites.map((site) => ({
      "@type": "PostalAddress",
      addressLocality: site.city ?? undefined,
      addressRegion: site.state,
      addressCountry: "US",
    })),
  };
}
