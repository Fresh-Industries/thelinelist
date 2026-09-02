import { getDirectoryPlants, getPlantBySlug } from "@/lib/directory";
import type { Plant } from "@/lib/directory/types";
import { matchManufacturerRecords } from "@/lib/sourcing/matching";
import type { SourcingFieldKey, SourcingWorkspace } from "@/lib/sourcing/types";
import { applyFounderFieldUpdate, createWorkspace } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

const REQUIRED_REQUIREMENTS: SourcingFieldKey[] = [
  "product_type",
  "manufacturing_process",
  "storage_distribution",
];

const PREFERRED_REQUIREMENTS: SourcingFieldKey[] = [
  "packaging_format",
  "packaging_size",
  "production_volume",
  "formulation_assistance",
  "preferred_geography",
];

describe("reviewed hot-sauce match evidence and ranking", () => {
  it("maps each reviewed claim to the official page that visibly supports it", () => {
    const spiceGuy = getPlantBySlug("the-spice-guy")!;
    const creative = getPlantBySlug("creative-foodworks")!;

    expect(spiceGuy.fieldSourceUrls).toMatchObject({
      products: ["https://saucecopackers.com/"],
      processes: ["https://saucecopackers.com/"],
      packaging: ["https://saucecopackers.com/faq"],
      minimums: ["https://saucecopackers.com/faq"],
    });
    expect(creative.fieldSourceUrls).toMatchObject({
      products: ["https://creativefw.com/products/hot-sauces"],
      processes: ["https://creativefw.com/capabilities/"],
      packaging: ["https://creativefw.com/products/hot-sauces"],
      minimums: ["https://creativefw.com/products/hot-sauces"],
    });
  });

  it("ranks The Spice Guy ahead of Creative with granular exact evidence", () => {
    const workspace = reportWorkspace();
    const plants = ["the-spice-guy", "creative-foodworks"].map((slug) => getPlantBySlug(slug)!);
    const matches = matchManufacturerRecords(workspace, plants, matchOptions());

    expect(matches.map((match) => match.manufacturerSlug)).toEqual(["the-spice-guy", "creative-foodworks"]);
    const spiceGuy = matches[0];
    expect(spiceGuy.supportedMatches).toEqual(expect.arrayContaining([
      "acidified processing is publicly listed.",
      "hot fill is publicly listed.",
      expect.stringMatching(/woozy bottles/i),
      expect.stringMatching(/5 oz/i),
      "Formulation or product-development help is publicly listed.",
      "Published information supports Shelf-stable.",
    ]));
    expect(spiceGuy.possibleConflicts).toEqual(["Listed facilities are outside the Midwest preference."]);
    expect(spiceGuy.unknowns).toContain("The reviewed woozy-bottle evidence does not publicly establish the container material as glass.");
    for (const evidence of spiceGuy.evidence.filter((item) => item.requirementKey === "manufacturing_process")) {
      expect(evidence.sourceUrl).toBe("https://saucecopackers.com/");
    }
    expect(spiceGuy.evidence.find((item) => item.requirementKey === "product_type")?.sourceUrl).toBe("https://saucecopackers.com/");
    expect(spiceGuy.evidence.find((item) => item.requirementKey === "formulation_assistance")?.sourceUrl).toBe("https://saucecopackers.com/");
    expect(spiceGuy.evidence.find((item) => item.requirementKey === "storage_distribution")?.sourceUrl).toBe("https://saucecopackers.com/");
    expect(spiceGuy.evidence.find((item) => item.requirementKey === "packaging_format" && /woozy/i.test(item.claim))?.sourceUrl)
      .toBe("https://saucecopackers.com/faq");
    expect(spiceGuy.evidence.find((item) => item.requirementKey === "packaging_size")?.sourceUrl)
      .toBe("https://saucecopackers.com/faq");

    const creative = matches[1];
    expect(creative.supportedMatches).toEqual(expect.arrayContaining([
      "acidified processing is publicly listed.",
      "hot fill is publicly listed.",
      "Formulation or product-development help is publicly listed.",
    ]));
    expect(creative.possibleConflicts).toEqual(expect.arrayContaining([
      expect.stringContaining("outside the published 8–32 oz"),
      expect.stringContaining("about 195.3 gallons"),
      "Listed facilities are outside the Midwest preference.",
    ]));
    expect(creative.evidence.find((item) => item.requirementKey === "formulation_assistance")?.sourceUrl)
      .toBe("https://creativefw.com/capabilities/");
    for (const evidence of creative.evidence.filter((item) => ["manufacturing_process", "formulation_assistance", "storage_distribution"].includes(item.requirementKey))) {
      expect(evidence.sourceUrl).toBe("https://creativefw.com/capabilities/");
    }
    for (const evidence of creative.evidence.filter((item) => ["product_type", "packaging_format", "packaging_size", "production_volume"].includes(item.requirementKey))) {
      expect(evidence.sourceUrl).toBe("https://creativefw.com/products/hot-sauces");
    }

    for (const requiredKey of ["packaging_size", "production_volume"] as const) {
      const strict = matchManufacturerRecords(workspace, plants, {
        resultLimit: 3,
        requiredRequirements: [...REQUIRED_REQUIREMENTS, requiredKey],
        preferredRequirements: PREFERRED_REQUIREMENTS.filter((key) => key !== requiredKey),
      });
      expect(strict.map((match) => match.manufacturerSlug)).not.toContain("creative-foodworks");
    }
  });

  it("keeps a hot-fill-only preferred candidate explicit but excludes it when the composite process is required", () => {
    const workspace = reportWorkspace();
    const hotFillOnly = hotFillOnlyPlant();
    const required = matchManufacturerRecords(workspace, [hotFillOnly], matchOptions());
    expect(required).toEqual([]);

    const preferred = matchManufacturerRecords(workspace, [hotFillOnly], {
      resultLimit: 3,
      requiredRequirements: ["product_type", "storage_distribution"],
      preferredRequirements: ["manufacturing_process"],
    });
    expect(preferred).toHaveLength(1);
    expect(preferred[0].supportedMatches).toContain("hot fill is publicly listed.");
    expect(preferred[0].unknowns).toContain("acidified processing is not publicly listed.");
    expect(preferred[0].fitExplanation).not.toMatch(/supports .*manufacturing process/i);
  });

  it("keeps The Spice Guy ahead of Creative in the full reviewed directory", () => {
    const matches = matchManufacturerRecords(reportWorkspace(), getDirectoryPlants(), matchOptions());
    const slugs = matches.map((match) => match.manufacturerSlug);
    expect(slugs).toContain("the-spice-guy");
    const creativeIndex = slugs.indexOf("creative-foodworks");
    expect(creativeIndex === -1 || slugs.indexOf("the-spice-guy") < creativeIndex).toBe(true);
  });
});

function reportWorkspace(): SourcingWorkspace {
  let workspace = createWorkspace({ idea: "Fictional smoked peach habanero hot sauce." });
  const updates: Array<[SourcingFieldKey, string]> = [
    ["product_type", "Hot sauce"],
    ["manufacturing_process", "Acidified, shelf-stable hot-fill"],
    ["storage_distribution", "Shelf-stable"],
    ["packaging_format", "5 fl oz glass woozy bottle"],
    ["packaging_size", "5 oz"],
    ["production_volume", "5,000 bottles"],
    ["formulation_assistance", "Process-authority and acidified-food help needed"],
    ["preferred_geography", "Midwest"],
  ];
  for (const [key, value] of updates) {
    workspace = applyFounderFieldUpdate(workspace, { key, value, status: "confirmed", shareWithManufacturer: true });
  }
  return workspace;
}

function matchOptions() {
  return {
    resultLimit: 3,
    requiredRequirements: REQUIRED_REQUIREMENTS,
    preferredRequirements: PREFERRED_REQUIREMENTS,
  };
}

function hotFillOnlyPlant(): Plant {
  const plant = getPlantBySlug("the-spice-guy")!;
  return {
    ...plant,
    slug: "hot-fill-only-fixture",
    name: "Hot Fill Only Fixture",
    processes: ["hot-fill"],
    productTypesPublished: "Hot sauce.",
    manufacturingCapabilitiesPublished: "Hot-fill production; shelf stability support; product development.",
    rawProductTags: [],
    rawCapabilityTags: [],
    overview: ["Hot-fill hot sauce with shelf stability support and product development."],
  };
}
