import type { Plant } from "@/lib/directory";
import { PARENT_ORG, SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    email: SITE_EMAIL,
    parentOrganization: {
      "@type": "Organization",
      name: PARENT_ORG,
    },
    description:
      "Public directory of verified U.S. food and beverage manufacturers. Facts come from plant sites.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
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
      item: item.href.startsWith("http") ? item.href : `${SITE_URL}${item.href}`,
    })),
  };
}

export function itemListJsonLd(plants: Plant[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Verified U.S. food and beverage manufacturers",
    numberOfItems: plants.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: plants.map((plant, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/copackers/${plant.slug}`,
      name: plant.name,
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
