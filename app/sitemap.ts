import { getPlantSlugs, LAST_VERIFIED } from "@/lib/directory";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/copackers",
    "/about",
    "/learn",
    "/glossary",
    "/guides/hpp",
    "/guides/hot-fill",
    "/guides/retort",
    "/guides/small-moq",
    "/guides/sauce",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
    ...getPlantSlugs().map((slug) => ({
      url: `${SITE_URL}/copackers/${slug}`,
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
  ];
}
