import { getPlantSlugs, LAST_VERIFIED, PRODUCT_CATEGORIES } from "@/lib/directory";
import { CORNERSTONE_GUIDES } from "@/lib/guides/cornerstones";
import { absoluteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/find-manufacturers",
    "/find-manufacturers/wizard",
    "/about",
    "/guides",
    "/how-we-verify",
    "/newsletter",
    "/privacy",
    "/terms",
    "/glossary",
    "/guides/hpp",
    "/guides/hot-fill",
    "/guides/retort",
    "/guides/small-moq",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: absoluteUrl(path),
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
    ...PRODUCT_CATEGORIES.map((category) => ({
      url: absoluteUrl(`/find-manufacturers/${category.slug}`),
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
    ...CORNERSTONE_GUIDES.map((guide) => ({
      url: absoluteUrl(`/guides/${guide.slug}`),
      lastModified: LAST_VERIFIED,
      changeFrequency: "monthly" as const,
    })),
    ...getPlantSlugs().map((slug) => ({
      url: absoluteUrl(`/manufacturers/${slug}`),
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
  ];
}
