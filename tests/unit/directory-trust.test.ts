import { mapCategories, mapProcesses } from "@/scripts/import-manufacturers.mjs";
import { describe, expect, it } from "vitest";
import { filterPlants, getPlantBySlug, smallRunSignalForPlant } from "@/lib/directory";
import { plantMatchesCategory } from "@/lib/directory/categories";
import { hasHotSauceClaim } from "@/lib/directory/hot-sauce.mjs";
import { publishedCapabilityStatus } from "@/lib/directory/capability-evidence.mjs";
import { publishedSmallRunOption } from "@/lib/directory/small-runs.mjs";
import { hasPublishedMinimum } from "@/lib/directory/minimum-disclosure.mjs";
import { compareProductionVolume, matchManufacturerRecords } from "@/lib/sourcing/matching";
import { applyFounderFieldUpdate, createWorkspace } from "@/lib/sourcing/workspace";
import type { SourcingFieldKey } from "@/lib/sourcing/types";

const urls = ["https://example.com/copacking"];
const compare = (request: string, minimum: string | null, size = "5 fl oz") => compareProductionVolume(request, size, "Glass bottle", minimum);

function workspace(product = "Hot sauce", volume = "10,000 bottles") {
  let value = createWorkspace({ idea: "A bottled hot sauce for grocery stores" });
  for (const [key, field] of Object.entries({ product_type: product, product_format: "Pourable sauce", formula_status: "Recipe ready", packaging_format: "Glass bottle", packaging_size: "5 fl oz", production_volume: volume, storage_distribution: "Shelf-stable" })) {
    value = applyFounderFieldUpdate(value, { key: key as SourcingFieldKey, value: field, status: "confirmed" });
  }
  return value;
}

describe("directory trust regressions", () => {
  it.each(["Industrial retailer-scale, not a first-run kitchen.", "No pilot runs offered.", "First-run suitability unknown.", "A possible small-batch fit."])("does not extract support from %s", (text) => {
    expect(publishedSmallRunOption(text, null, urls)).toBeUndefined();
  });
  it.each([null, "Unknown", "Dependent on the item", "Minimum 50,000 bottles", "Warehouse storage from 4 pallets", "No minimum is published. 40-gallon kettles for small trial batches."])("does not turn MOQ into small-run suitability: %s", (minimum) => {
    expect(publishedSmallRunOption("Contract manufacturing", minimum, urls)).toBeUndefined();
  });
  it("preserves explicit options as qualified leads, with offer types", () => {
    expect(publishedSmallRunOption("Small-batch production", null, urls)?.kind).toBe("small-batch");
    expect(publishedSmallRunOption("Pilot batches as small as 50 pounds", null, urls)?.kind).toBe("pilot");
    expect(publishedSmallRunOption("Small-batch private-label products", null, urls)?.kind).toBe("private-label");
    expect(publishedSmallRunOption("Small-batch production", null, [])).toBeUndefined();
  });
  it("removes live imported false positives and the curated numeric fallback", () => {
    const matches = filterPlants({ smallRunSignal: true }).map((p) => p.slug);
    for (const slug of ["8th-avenue-food-and-provisions-formerly-attune-foods", "pan-o-gold-baking-company", "skyway-foods", "create-a-pack-foods-inc", "kaye-family-foods"]) expect(matches).not.toContain(slug);
    expect(smallRunSignalForPlant({ ...getPlantBySlug("creative-foodworks")!, smallRunSignal: undefined, manufacturingCapabilitiesPublished: null })).toBeUndefined();
  });
  it.each(["Plant capacity 50,000 units annually", "2,000-gallon standard batch runs", "Contact form lowest band is 50000 units", "Dependent on the item"])("does not disclose a MOQ from %s", (text) => expect(hasPublishedMinimum(text)).toBe(false));
  it("retains a sourced explicit MOQ even when an accompanying form note has a range", () => {
    const plant = getPlantBySlug("create-a-pack-foods-inc")!;
    expect(hasPublishedMinimum(plant.moqDisplay)).toBe(true);
    expect(filterPlants({ moqDisclosed: true }).map((p) => p.slug)).toContain(plant.slug);
    expect(smallRunSignalForPlant(plant)).toBeUndefined();
    expect(hasPublishedMinimum("No minimum")).toBe(true);
    expect(hasPublishedMinimum("No minimum is published. 40-gallon kettles for small trial batches.")).toBe(false);
  });
  it.each(["Hot sauce", "Hot sauces", "hot-sauce", "hot-sauces"])("shares exact taxonomy for %s", (product) => {
    const plant = { ...getPlantBySlug("creative-foodworks")!, productTypesPublished: product, rawProductTags: [], categories: [] };
    expect(hasHotSauceClaim(product)).toBe(true);
    expect(mapCategories({ product_types: product })).toContain("hot-sauce");
    expect(plantMatchesCategory(plant, "hot-sauce")).toBe(true);
    const matches = matchManufacturerRecords(workspace(product), [plant], { requiredRequirements: ["product_type"] });
    expect(matches).toHaveLength(1);
    expect(matches[0].supportedMatches).toContain("Reviewed product information explicitly names hot sauce.");
  });
  it.each(["Sauces", "Hot-fill sauces", "Hot sauce powder mix", "No hot sauce", "Hot sauce capability unknown"])("does not broaden exact taxonomy from %s", (text) => expect(hasHotSauceClaim(text)).toBe(false));
  it("excludes explicit hot-sauce incompatibility even when broader sauce matching is allowed", () => {
    const plant = { ...getPlantBySlug("creative-foodworks")!, productTypesPublished: "Sauces and condiments. No hot sauce.", rawProductTags: [] };
    expect(matchManufacturerRecords(workspace(), [plant])).toHaveLength(0);
    expect(plantMatchesCategory(plant, "hot-sauce")).toBe(false);
  });
  it("uses the reviewed Heritage product claim in directory and sourcing", () => {
    const plant = getPlantBySlug("heritage-family-specialty-foods")!;
    expect(plantMatchesCategory(plant, "hot-sauce")).toBe(true);
    expect(matchManufacturerRecords(workspace(), [plant], { requiredRequirements: ["product_type"] })).toHaveLength(1);
  });
});

describe("production minimum comparability", () => {
  it("keeps missing MOQ unknown even with a small-batch capability source", () => {
    const plant = { ...getPlantBySlug("creative-foodworks")!, moqDisplay: null };
    const match = matchManufacturerRecords(workspace(), [plant])[0];
    expect(match.unknowns).toContain("The current minimum is not publicly listed.");
    expect(match.supportedMatches.join(" ")).not.toMatch(/minimum/);
  });
  it.each(["Minimum 500 pounds", "Minimum 500 cases", "Minimum 500 jars", "Minimum $500 per order"])("does not compare 1000 bottles against %s", (minimum) => {
    expect(compare("1000 bottles", minimum)?.compatible ?? null).toBeNull();
  });
  it("keeps known compatible and incompatible quantities distinct", () => {
    expect(compare("2000 bottles", "Minimum 1000 bottles")?.compatible).toBe(true);
    expect(compare("500 bottles", "Minimum 1000 bottles")?.compatible).toBe(false);
  });
  it("never borrows private-label or pilot floors for commercial production", () => {
    expect(compare("1000 bottles", "Private-label minimum 100 bottles; commercial minimum 5000 bottles")?.compatible).toBe(false);
    expect(compare("1000 bottles", "Pilot minimum 100 bottles; commercial MOQ not published")?.compatible ?? null).toBeNull();
    expect(compare("Pilot 1000 bottles", "Commercial minimum 500 bottles")?.compatible).toBeNull();
    expect(compare("Private-label 1000 bottles per SKU", "Private-label minimum 100 bottles per SKU")?.compatible).toBe(true);
  });
  it("requires per-flavor quantities before reporting positive fit", () => {
    expect(compare("1000 bottles across 4 flavors", "Minimum 500 bottles per flavor")?.compatible).toBeNull();
    expect(compare("1000 bottles per flavor", "Minimum 500 bottles per flavor")?.claim).toContain("per flavor");
    expect(compare("100 bottles total", "Minimum 500 bottles per flavor")?.compatible).toBe(false);
  });
  it("keeps SKU, flavor, run and order allocations distinct", () => {
    expect(compare("1000 bottles per SKU", "Minimum 500 bottles per flavor")?.compatible).toBeNull();
    expect(compare("100 bottles per SKU", "Minimum 500 bottles per flavor")?.compatible).toBeNull();
    expect(compare("1000 bottles across 4 orders", "Minimum 500 bottles per order")?.compatible).toBeNull();
    expect(compare("1000 bottles per order", "Minimum 500 bottles per order")?.compatible).toBe(true);
    expect(compare("1000 bottles across 4 runs", "Minimum 500 bottles per run")?.compatible).toBeNull();
  });
  it("preserves fluid units and offer-specific per-flavor quantities from intake", () => {
    const state = createWorkspace({ idea: "A hot-sauce in a 9.5 fl oz glass jar; first pilot 1,200 jars per flavor; year-one estimate 30,000 jars." });
    expect(state.fields.product_type.value).toBe("Hot sauce");
    expect(state.fields.packaging_size.value).toBe("9.5 fl oz");
    expect(state.fields.production_volume.value).toBe("Pilot: 1,200 jars per flavor");
  });
  it("preserves an intake quantity range instead of confirming its high endpoint", () => {
    const state = createWorkspace({ idea: "Hot sauce in glass bottles; first run 1,000–5,000 bottles per flavor." });
    expect(state.fields.production_volume.value).toBe("1,000–5,000 bottles per flavor");
    expect(compare(state.fields.production_volume.value!, "Minimum 2000 bottles per flavor")?.compatible).toBeNull();
  });
  it("does not treat ambiguous ounces as fluid ounces", () => {
    expect(compare("1000 bottles", "Minimum 50 gallons", "5 oz")).toBeNull();
    expect(compare("1000 bottles", "Minimum 50 gallons", "5 fl oz")?.compatible).toBe(false);
  });
  it("does not turn an inquiry band or conflicting numbers into a hard mismatch", () => {
    expect(compare("1000 bottles", "Contact form lowest band is 50000 units for glass bottles")?.compatible).toBeNull();
    expect(compare("1000 bottles", "Typical 500 units; contact form states MOQ is 5000 units")?.compatible).toBeNull();
  });
  it("does not use an annual projection, range endpoint, or maximum as a first-run minimum", () => {
    expect(compare("1000-5000 bottles", "Minimum 2000 bottles")?.compatible).toBeNull();
    expect(compare("100000 bottles per year", "Minimum 2000 bottles")?.compatible).toBeNull();
    expect(compare("1000 bottles", "Maximum 500 cases of 12 bottles")?.compatible ?? null).toBeNull();
  });
  it("ranks a possible fit above a known quantity mismatch even without preferences", () => {
    const base = getPlantBySlug("creative-foodworks")!;
    const matches = matchManufacturerRecords(workspace(), [{ ...base, slug: "incompatible", name: "A", moqDisplay: "Minimum 50000 bottles" }, { ...base, slug: "unknown", name: "B", moqDisplay: null }]);
    expect(matches.map((p) => p.manufacturerSlug)).toEqual(["unknown", "incompatible"]);
    expect(matches[1].possibleConflicts.join(" ")).toContain("below the published");
  });
});


describe("capability negation", () => {
  it("removes the four imported false process tags from actual directory filters", () => {
    const slugs = (process: "cold-fill" | "hot-fill" | "acidified") => filterPlants({ process }).map((plant) => plant.slug);
    expect(slugs("cold-fill")).not.toContain("croix-valley-foods");
    expect(slugs("hot-fill")).not.toContain("lupo-s-bottling-llc");
    expect(slugs("acidified")).not.toContain("hno-blending-solutions");
    expect(slugs("acidified")).not.toContain("pack-n-fresh");
    expect(mapProcesses({ manufacturing_capabilities: "No hot-fill. Cold-fill marinades." })).toEqual(["cold-fill"]);
  });
  it("does not map a negated hot-fill or refrigeration claim to support", () => {
    expect(publishedCapabilityStatus("No hot-fill capability. Cold-fill production.", ["hot-fill", "hot fill"])).toBe("mismatch");
    expect(publishedCapabilityStatus("No ambient-fill salad dressings, pouch liquids, refrigerated, or powders.", ["refrigerated"])).toBe("mismatch");
    expect(publishedCapabilityStatus("HPP not confirmed", ["HPP"])).toBe("unknown");
    expect(publishedCapabilityStatus("Hot-fill line. No hot-fill offered.", ["hot-fill"])).toBe("conflicting");
  });
});
