import { capabilityContradictions } from "@/lib/directory/assert";
import { categoryFaqs, filterPlants, getPlantBySlug, paginatePlants } from "@/lib/directory";
import { comparableMoq, categorySnapshot } from "@/lib/directory/snapshot";
import type { Plant } from "@/lib/directory/types";
import { describe, expect, it } from "vitest";

describe("directory trust and pagination", () => {
  it("keeps the dry-only California Spice Basket out of prepared refrigerated foods", () => {
    expect(filterPlants({ category: "prepared-refrigerated-foods" }).map((plant) => plant.slug))
      .not.toContain("california-spice-basket-inc");
  });

  it("does not publish a selected capability that its description negates", () => {
    const thermalKitchen = getPlantBySlug("thermal-kitchen");
    expect(thermalKitchen).toBeDefined();
    expect(capabilityContradictions(thermalKitchen!)).toEqual([]);

    const contradictory = {
      ...thermalKitchen,
      productTypesPublished: "This is not retort.",
    } as Plant;
    expect(capabilityContradictions(contradictory)).toContain("retort");

    const scopedQualifier = {
      ...thermalKitchen,
      overview: [...thermalKitchen!.overview, "High-acid products are not retort processed; another suitable line uses retort."],
    } as Plant;
    expect(capabilityContradictions(scopedQualifier)).toEqual([]);
  });

  it("paginates between 24 and 36 records and retains a global start index", () => {
    const all = filterPlants({});
    const first = paginatePlants(all, 1);
    const second = paginatePlants(all, 2);
    expect(first.plants).toHaveLength(30);
    expect(second.startIndex).toBe(30);
    expect(second.totalCount).toBe(all.length);
  });

  it("compares MOQ values only when one compatible unit is explicit", () => {
    expect(comparableMoq("Minimums start as low as 250 units.")).toEqual({ amount: 250, unit: "units" });
    expect(comparableMoq("Minimum: 50 gallons per flavor, approximately 1,200 five-ounce woozy bottles.")).toEqual({ amount: 50, unit: "gallons" });
    expect(comparableMoq("Exact minimum not published.")).toBeNull();
    expect(comparableMoq("No per-SKU minimum is published. The inquiry form asks about production of 11,000 gallons per day.")).toBeNull();
    expect(comparableMoq("The company states that small-batch packet runs range from 15,000 to 500,000 packets.")).toBeNull();
  });

  it("presents manufacturer minimums as readable, qualified copy", () => {
    expect(getPlantBySlug("paradise-food-beverage")?.moqDisplay).toBe(
      "Exact minimum not published. The company says typical projects may start at 100 units.",
    );
    expect(getPlantBySlug("craft-cannery")?.moqDisplay).toBe(
      "No minimum is published. The company lists 40-gallon kettles for small or trial batches.",
    );

    const publicMinimumCopy = filterPlants({}).flatMap((plant) => plant.moqDisplay ? [plant.moqDisplay] : []);
    expect(publicMinimumCopy.join("\n")).not.toMatch(
      /\b(?:Page|FAQ):|\((?:site|stated|directory-published)[^)]*\)|claimed \(/i,
    );
  });

  it("reports the complete Hot Sauce snapshot without mixing MOQ units", () => {
    const plants = filterPlants({ category: "hot-sauce" });

    expect(plants).toHaveLength(7);
    expect(plants.map((plant) => plant.slug)).toContain("creative-foodworks");
    expect(plants.map((plant) => plant.slug)).not.toContain("acecopack");
    expect(categorySnapshot(plants)).toMatchObject({
      matchingManufacturers: 7,
      publishingMinimums: 2,
      comparableMoqRange: "50–1,000 gallons across 2 published minimums",
      commonProcesses: ["Hot fill", "Acidified", "Pack-out"],
      commonPackaging: ["bottles", "pouches", "jars"],
      states: ["CO", "DE", "IN", "NJ", "TX"],
    });
  });

  it("keeps process and equipment statements out of packaging fields", () => {
    const spiceGuy = getPlantBySlug("the-spice-guy");
    const fischerWieser = getPlantBySlug("fischer-wieser");

    expect(spiceGuy?.packaging).toBeNull();
    expect(spiceGuy?.manufacturingCapabilitiesPublished).toBe("100-gal kettles; hot-fill all products.");
    expect(fischerWieser?.packaging).toBeNull();
    expect(fischerWieser?.manufacturingCapabilitiesPublished).toBe(
      "Hot-fill shelf-stable. No ambient-fill salad dressings, pouch liquids, refrigerated, or powders.",
    );
  });

  it("does not count missing or throughput-only minimums in category snapshots", () => {
    const yoshida = getPlantBySlug("yoshida-foods");
    const craftCannery = getPlantBySlug("craft-cannery");
    expect(yoshida?.publishedSmallMoq).toBe(false);
    expect(categorySnapshot([yoshida!, craftCannery!]).publishingMinimums).toBe(0);
  });

  it("keeps disclosed dollar project floors in the minimum filter", () => {
    const disclosed = filterPlants({ moqDisclosed: true }).map((plant) => plant.slug);
    expect(disclosed).toContain("minimus-products");
    expect(disclosed).toContain("scale-food-labs");
    expect(disclosed).not.toContain("craft-cannery");
  });

  it("keeps standard batch disclosures in the minimum filter after copy normalization", () => {
    const disclosed = filterPlants({ moqDisclosed: true }).map((plant) => plant.slug);
    expect(disclosed).toContain("bevpro-solutions-formerly-beer-dudes-canning");
  });

  it("does not infer jars from glass material or a negated glass format", () => {
    const trisco = getPlantBySlug("trisco-foods");
    expect(trisco).toBeDefined();
    expect(categorySnapshot([trisco!]).commonPackaging).not.toContain("jars");
    expect(filterPlants({ packaging: "jar" }).map((plant) => plant.slug)).not.toContain("trisco-foods");
  });

  it("answers the hot-sauce process-authority question directly", () => {
    const faq = categoryFaqs("hot-sauce")[1];
    expect(faq.question).toMatch(/process-authority/i);
    expect(faq.answer).toMatch(/qualified process authority/i);
    expect(faq.answer).toMatch(/scheduled process/i);
  });
});
