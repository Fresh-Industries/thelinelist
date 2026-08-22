import { getPlantSlugs } from "@/lib/directory";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://the-line-list.vercel.app";
  const staticRoutes = [
    "",
    "/copackers",
    "/about",
    "/glossary",
    "/guides/hpp",
    "/guides/hot-fill",
    "/guides/retort",
    "/guides/small-moq",
    "/guides/sauce",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${base}${path}`,
      lastModified: "2026-08-21",
    })),
    ...getPlantSlugs().map((slug) => ({
      url: `${base}/copackers/${slug}`,
      lastModified: "2026-08-21",
    })),
  ];
}
