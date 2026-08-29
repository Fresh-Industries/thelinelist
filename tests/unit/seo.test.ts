import {
  filterPlants,
  getIndexableProductCategories,
  getPlantBySlug,
  isPlantIndexable,
} from "@/lib/directory";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  articleJsonLd,
  collectionPageJsonLd,
  plantProfileJsonLd,
} from "@/lib/seo/jsonld";
import { absoluteUrl, LAST_CHECKED_LABEL } from "@/lib/site";
import nextConfig from "@/next.config";
import { describe, expect, it } from "vitest";

describe("SEO URL and structured-data conventions", () => {
  it("permanently redirects the legacy claim route to the canonical form", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toContainEqual({ source: "/claim", destination: "/claim-submit", permanent: true });
  });
  it("allows the Playwright loopback origin to load Next development assets", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });

  it("uses no trailing slash for non-root internal URLs", () => {
    expect(absoluteUrl("/")).toBe("https://www.thelinelist.com");
    expect(absoluteUrl("/find-manufacturers/")).toBe("https://www.thelinelist.com/find-manufacturers");
    expect(absoluteUrl("/manufacturers/example/")).toBe("https://www.thelinelist.com/manufacturers/example");
  });

  it("keeps the visible listing-review label synchronized with the catalog date", () => {
    expect(LAST_CHECKED_LABEL).toBe("24 Aug 2026");
  });

  it("numbers ItemList entries for the current paginated slice", () => {
    const plants = filterPlants({}).slice(18, 23);
    const schema = collectionPageJsonLd({
      name: "Directory page 2",
      description: "Manufacturers",
      path: "/find-manufacturers/page/2",
      plants,
      startPosition: 19,
    });
    const list = schema.mainEntity!;
    expect(list.numberOfItems).toBe(5);
    expect(list.itemListElement[0].position).toBe(19);
    expect(list.itemListElement[4].position).toBe(23);
    expect(list.itemListElement.every((item) => !item.url.endsWith("/"))).toBe(true);
  });

  it("publishes one canonical-host sitemap URL per indexable page", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith("https://www.thelinelist.com"))).toBe(true);
    expect(urls.some((url) => url.includes("/copackers"))).toBe(false);
    expect(urls).toContain("https://www.thelinelist.com/for-manufacturers");
    expect(urls).not.toContain("https://www.thelinelist.com/manufacturers/alpenrose-dairy-smith-brothers-farm");

    for (const category of getIndexableProductCategories()) {
      expect(urls).toContain(`https://www.thelinelist.com/find-manufacturers/${category.slug}`);
      expect(filterPlants({ category: category.slug }).filter(isPlantIndexable).length).toBeGreaterThan(0);
    }
  });

  it("keeps robots output minimal and points at the canonical sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://www.thelinelist.com/sitemap.xml",
    });
    expect(robots()).not.toHaveProperty("host");
  });

  it("models a manufacturer profile as the main entity and uses the official site as sameAs", () => {
    const plant = getPlantBySlug("innomark")!;
    const schema = plantProfileJsonLd(plant);
    expect(schema["@type"]).toBe("ProfilePage");
    expect(schema.url).toBe("https://www.thelinelist.com/manufacturers/innomark");
    expect(schema.mainEntity).toMatchObject({
      "@type": "Organization",
      url: "https://www.thelinelist.com/manufacturers/innomark",
      sameAs: [plant.website.href],
    });
  });

  it("includes both visible editorial dates in article structured data", () => {
    const schema = articleJsonLd({
      headline: "Guide",
      description: "Description",
      path: "/guides/example",
      image: "/images/example.webp",
      datePublished: "2026-08-23",
      dateModified: "2026-08-24",
    });
    expect(schema.datePublished).toBe("2026-08-23");
    expect(schema.dateModified).toBe("2026-08-24");
  });
});
