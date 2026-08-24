import { filterPlants } from "@/lib/directory";
import { collectionPageJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/site";
import nextConfig from "@/next.config";
import { describe, expect, it } from "vitest";

describe("SEO URL and structured-data conventions", () => {
  it("allows the Playwright loopback origin to load Next development assets", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });

  it("uses no trailing slash for non-root internal URLs", () => {
    expect(absoluteUrl("/")).toBe("https://www.thelinelist.com");
    expect(absoluteUrl("/find-manufacturers/")).toBe("https://www.thelinelist.com/find-manufacturers");
    expect(absoluteUrl("/manufacturers/example/")).toBe("https://www.thelinelist.com/manufacturers/example");
  });

  it("numbers ItemList entries for the current paginated slice", () => {
    const plants = filterPlants({}).slice(30, 35);
    const schema = collectionPageJsonLd({
      name: "Directory page 2",
      description: "Manufacturers",
      path: "/find-manufacturers/page/2",
      plants,
      startPosition: 31,
    });
    const list = schema.mainEntity!;
    expect(list.numberOfItems).toBe(5);
    expect(list.itemListElement[0].position).toBe(31);
    expect(list.itemListElement[4].position).toBe(35);
    expect(list.itemListElement.every((item) => !item.url.endsWith("/"))).toBe(true);
  });
});
