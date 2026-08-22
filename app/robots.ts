import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://the-line-list.vercel.app/sitemap.xml",
    host: "https://the-line-list.vercel.app",
  };
}
