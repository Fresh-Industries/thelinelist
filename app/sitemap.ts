import { DIRECTORY_PAGE_SIZE, getDirectoryPlants, getIndexableProductCategories, isPlantIndexable, LAST_VERIFIED } from "@/lib/directory";
import { CORNERSTONE_GUIDES } from "@/lib/guides/cornerstones";
import { absoluteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const directoryPageCount = Math.ceil(getDirectoryPlants().length / DIRECTORY_PAGE_SIZE);
  const staticRoutes = [
    "",
    "/find-manufacturers",
    "/find-manufacturers/wizard",
    "/about",
    "/for-manufacturers",
    "/guides",
    "/how-we-verify",
    "/newsletter",
    "/privacy",
    "/terms",
    "/glossary",
    "/guides/hpp",
    "/guides/hot-fill",
    "/guides/retort",
    "/guides/sauce",
    "/guides/small-moq",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: absoluteUrl(path),
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
    ...getIndexableProductCategories().map((category) => ({
      url: absoluteUrl(`/find-manufacturers/${category.slug}`),
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
    ...Array.from({ length: Math.max(0, directoryPageCount - 1) }, (_, index) => ({
      url: absoluteUrl(`/find-manufacturers/page/${index + 2}`),
      lastModified: LAST_VERIFIED,
      changeFrequency: "weekly" as const,
    })),
    ...CORNERSTONE_GUIDES.map((guide) => ({
      url: absoluteUrl(`/guides/${guide.slug}`),
      lastModified: LAST_VERIFIED,
      changeFrequency: "monthly" as const,
    })),
    ...getDirectoryPlants().flatMap((plant) => isPlantIndexable(plant) ? [{
      url: absoluteUrl(`/manufacturers/${plant.slug}`),
      lastModified: plant.lastVerified,
      changeFrequency: "weekly" as const,
    }] : []),
  ];
}
