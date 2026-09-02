import type { EvidenceField, Plant, SourceLink } from "./types";

interface ReviewedSourceOverride {
  links: SourceLink[];
  fields: Partial<Record<EvidenceField, string[]>>;
  data?: Partial<Pick<Plant, "productTypesPublished" | "packaging" | "moqDisplay" | "manufacturingCapabilitiesPublished" | "rawCapabilityTags">>;
}

const REVIEWED_SOURCE_OVERRIDES: Record<string, ReviewedSourceOverride> = {
  "creative-foodworks": {
    links: [
      { label: "Hot sauce capabilities", href: "https://creativefw.com/products/hot-sauces" },
      { label: "Product development and processing capabilities", href: "https://creativefw.com/capabilities/" },
    ],
    fields: {
      products: ["https://creativefw.com/products/hot-sauces"],
      processes: ["https://creativefw.com/capabilities/"],
      packaging: ["https://creativefw.com/products/hot-sauces"],
      minimums: ["https://creativefw.com/products/hot-sauces"],
    },
    data: {
      rawCapabilityTags: ["Product development", "Scale-up with food scientists", "Large-scale hot-filled production", "Hot-filled, acidified, or acid-based food", "Shelf-stable products with no refrigeration required"],
    },
  },
  "the-spice-guy": {
    links: [
      { label: "Sauce co-packing capabilities", href: "https://saucecopackers.com/" },
      { label: "Minimum order and packaging FAQ", href: "https://saucecopackers.com/faq" },
    ],
    fields: {
      products: ["https://saucecopackers.com/"],
      processes: ["https://saucecopackers.com/"],
      packaging: ["https://saucecopackers.com/faq"],
      minimums: ["https://saucecopackers.com/faq"],
    },
    data: {
      rawCapabilityTags: ["FDA certified Acidified Foods Packaging", "Hot-fill all products", "Scheduled process authority (shelf stability)", "Beginning-to-end start-up assistance"],
    },
  },
  "consolidated-mills-inc": {
    links: [
      { label: "Contract packaging", href: "https://consolidatedmills.com/contract-packaging/" },
    ],
    fields: {
      products: ["https://consolidatedmills.com/contract-packaging/"],
      processes: ["https://consolidatedmills.com/contract-packaging/"],
      packaging: ["https://consolidatedmills.com/contract-packaging/"],
      certifications: ["https://consolidatedmills.com/contract-packaging/"],
    },
  },
  "heritage-family-specialty-foods": {
    links: [
      { label: "Capabilities", href: "https://heritagefamilyfoods.com/capabilities/" },
    ],
    fields: {
      products: ["https://heritagefamilyfoods.com/capabilities/"],
      processes: ["https://heritagefamilyfoods.com/capabilities/"],
      packaging: ["https://heritagefamilyfoods.com/capabilities/"],
    },
    data: {
      productTypesPublished: "Hot sauce; soups, sauces, salsas, sides, mayonnaise, salad dressings, and prepared salads; shelf-stable, refrigerated, or frozen.",
    },
  },
  "abco-laboratories-inc": {
    links: [
      { label: "Food products and packaging", href: "https://www.abcolabs.com/food-products/" },
      { label: "Food packaging FAQ", href: "https://www.abcolabs.com/faqs/" },
    ],
    fields: {
      products: ["https://www.abcolabs.com/food-products/"],
      processes: ["https://www.abcolabs.com/food-products/"],
      packaging: ["https://www.abcolabs.com/faqs/"],
      certifications: ["https://www.abcolabs.com/faqs/"],
    },
  },
  "assemblers-inc": {
    links: [
      { label: "Products and facilities", href: "https://www.assemblers.com/facility" },
    ],
    fields: {
      products: ["https://www.assemblers.com/facility"],
      processes: ["https://www.assemblers.com/facility"],
      packaging: ["https://www.assemblers.com/facility"],
      certifications: ["https://www.assemblers.com/facility"],
    },
  },
  "chesapeake-bay-snacks": {
    links: [
      { label: "Co-packing capabilities", href: "https://koldkiss.com/pages/co-packing" },
    ],
    fields: {
      processes: ["https://koldkiss.com/pages/co-packing"],
      packaging: ["https://koldkiss.com/pages/co-packing"],
      minimums: ["https://koldkiss.com/pages/co-packing"],
    },
  },
};

function mergeLinks(current: SourceLink[], additions: SourceLink[]): SourceLink[] {
  return [...new Map([...current, ...additions].map((link) => [link.href, link])).values()];
}

export function applyReviewedFieldSources(plant: Plant): Plant {
  const override = REVIEWED_SOURCE_OVERRIDES[plant.slug];
  if (!override) return plant;
  return {
    ...plant,
    ...override.data,
    extraLinks: mergeLinks(plant.extraLinks ?? [], override.links),
    fieldSourceUrls: {
      ...plant.fieldSourceUrls,
      ...override.fields,
    },
  };
}
