import { capabilityContradictions } from "@/lib/directory/assert";
import {
  DIRECTORY_PAGE_SIZE,
  categoryFaqs,
  filterPlants,
  getIndexableProductCategories,
  getPlantBySlug,
  isPlantIndexable,
  parseDirectoryQuery,
  paginatePlants,
  queryToSearchParams,
  smallRunSignalForPlant,
} from "@/lib/directory";
import { comparableMoq, categorySnapshot } from "@/lib/directory/snapshot";
import type { Plant } from "@/lib/directory/types";
import { certificationCardClaims, claimSourceLabel, classifyCertificationClaims } from "@/lib/directory/certifications";
import { describe, expect, it } from "vitest";

describe("directory trust and pagination", () => {
  it("keeps the dry-only California Spice Basket out of prepared refrigerated foods", () => {
    const prepared = filterPlants({ category: "prepared-refrigerated-foods" }).map((plant) => plant.slug);
    expect(prepared).toEqual(expect.arrayContaining(["boulder-organic-foods-bolder-foods", "harvest-food-group", "portland-plant-foods"]));
    expect(prepared).not.toContain("california-spice-basket-inc");
  });

  it("keeps dry beverage pods separate from bottled wellness drinks", () => {
    const completeCoPack = getPlantBySlug("complete-copack-kcupcopack");
    expect(completeCoPack?.categories).toContain("dry-coffee-tea");
    expect(completeCoPack?.categories).not.toContain("functional-beverages");
    expect(completeCoPack?.categories).not.toContain("rtd-coffee-tea");
    expect(completeCoPack?.finderProducts).toEqual([]);
  });

  it("does not put dry goods, snacks, bakery, or supplements in the prepared-RTE facet", () => {
    const prepared = filterPlants({ product: "prepared-rte" }).map((plant) => plant.slug);
    expect(prepared).not.toContain("acecopack");
    expect(prepared).not.toContain("california-spice-basket-inc");
    expect(prepared).not.toContain("complete-copack-kcupcopack");
    expect(prepared).not.toContain("deland-bakery-natural-products");
  });

  it("does not infer dairy from fruit butter", () => {
    expect(getPlantBySlug("muirhead-canning-company")?.categories).not.toContain("dairy");
    expect(filterPlants({ category: "dairy" }).map((plant) => plant.slug)).not.toContain("muirhead-canning-company");
  });

  it("does not infer dairy from negated or regulatory mentions", () => {
    const dairy = filterPlants({ category: "dairy" }).map((plant) => plant.slug);
    expect(dairy).not.toContain("yoshida-foods");
    expect(dairy).not.toContain("minimus-products");
  });

  it("does not infer packaged water from water-spray equipment", () => {
    const water = filterPlants({ category: "water" }).map((plant) => plant.slug);
    expect(water).toContain("noel-canning-and-bottling");
    expect(water).not.toContain("thermal-kitchen");
  });

  it("does not classify a liquid beverage base as a dry mix", () => {
    expect(getPlantBySlug("trisco-foods")?.categories).not.toContain("spices-dry-mixes");
    expect(filterPlants({ category: "spices-dry-mixes" }).map((plant) => plant.slug)).not.toContain("trisco-foods");
  });

  it("does not infer bakery products from liquid filling services", () => {
    const bakery = filterPlants({ category: "bakery" }).map((plant) => plant.slug);
    expect(bakery).not.toContain("copacking-express");
    expect(bakery).not.toContain("precision-pack-partners");
  });

  it("does not infer soup products from stock packaging", () => {
    expect(filterPlants({ category: "soups-broths-entrees" }).map((plant) => plant.slug))
      .not.toContain("select-juice");
  });

  it("does not present row-level import provenance as field-specific evidence", () => {
    expect(getPlantBySlug("california-spice-basket-inc")?.fieldSourceUrls).toBeUndefined();
    expect(getPlantBySlug("alpenrose-dairy-smith-brothers-farm")?.fieldSourceUrls).toBeUndefined();
    expect(getPlantBySlug("innomark")?.fieldSourceUrls?.products).toEqual([
      "https://innomarkinc.com/",
      "https://innomarkinc.com/private-label/",
    ]);
    expect(getPlantBySlug("innomark")?.fieldSourceUrls?.certifications).toEqual([
      "https://innomarkinc.com/",
      "https://innomarkinc.com/private-label/",
    ]);
  });

  it("maps named manufacturer corrections from explicit public product claims", () => {
    expect(getPlantBySlug("noel-canning-and-bottling")?.categories).toContain("water");
    expect(getPlantBySlug("innomark")?.categories).toEqual([
      "functional-beverages",
      "juice",
      "rtd-coffee-tea",
      "supplements",
    ]);
    expect(getPlantBySlug("innomark")?.categories).not.toContain("prepared-refrigerated-foods");
    expect(getPlantBySlug("baxters-north-america")?.categories).toEqual([
      "shelf-stable-meals",
      "frozen-foods",
      "soups-broths-entrees",
    ]);
  });

  it("keeps ownership-uncertain plants visible but out of indexable surfaces", () => {
    const alpenrose = getPlantBySlug("alpenrose-dairy-smith-brothers-farm");
    expect(alpenrose).toMatchObject({
      needsCurrentOwnershipVerification: true,
      introductionsPaused: true,
    });
    expect(isPlantIndexable(alpenrose!)).toBe(false);
    expect(alpenrose?.verificationNotice).toMatch(/current ownership or operating details/i);
    expect(alpenrose?.verificationNotice).not.toMatch(/Clackamas|April 2026/);
  });

  it("keeps directory-reported LISTABLE profiles out of indexable surfaces", () => {
    const listable = filterPlants({}).find((plant) => plant.listingStatus === "LISTABLE");
    expect(listable).toBeDefined();
    expect(isPlantIndexable(listable!)).toBe(false);
  });

  it("separates regulatory, safety-system, third-party, and product certification claims", () => {
    const groups = classifyCertificationClaims(["FDA approved", "HACCP", "HACCP training", "SQF Level 2", "SQF Level 3 HACCP", "Organic (Oregon Tilth)", "Nut-free facility", "third-party audited"]);
    expect(groups.regulatoryStatus.join(" ")).not.toMatch(/FDA approved/i);
    expect(groups.regulatoryStatus.join(" ")).toMatch(/confirm current registration or inspection scope/i);
    expect(groups.foodSafetySystems).toEqual(["HACCP", "HACCP training"]);
    expect(groups.thirdPartyCertifications).toEqual(["SQF Level 2", "SQF Level 3"]);
    expect(groups.productFacilityCertifications).toEqual(["Organic (Oregon Tilth)"]);
    expect(groups.facilityClaims).toEqual(["Nut-free facility"]);
    expect(groups.otherPublishedClaims).toEqual(["third-party audited"]);
  });

  it("shows USDA Organic once and does not mislabel it as regulatory status", () => {
    const groups = classifyCertificationClaims(["USDA certified organic facility"]);
    expect(groups.regulatoryStatus).toEqual([]);
    expect(groups.productFacilityCertifications).toEqual(["USDA certified organic facility"]);

    const completeCoPack = getPlantBySlug("complete-copack-kcupcopack");
    expect(completeCoPack).toBeDefined();
    const cardClaims = certificationCardClaims(completeCoPack!);
    expect(cardClaims).toEqual(["USDA certified organic facility"]);
    expect(new Set(cardClaims.map((claim) => claim.toLowerCase())).size).toBe(cardClaims.length);
  });

  it("uses descriptive, non-duplicated source labels on every profile", () => {
    for (const plant of filterPlants({})) {
      const links = [plant.website, ...(plant.extraLinks ?? [])].filter((source, index, all) => (
        all.findIndex((candidate) => candidate.href.replace(/\/$/, "") === source.href.replace(/\/$/, "")) === index
      ));
      const labels = links.map((source) => source.label);
      expect(new Set(labels).size, plant.slug).toBe(labels.length);
      expect(labels.join(" "), plant.slug).not.toMatch(/Official source|Additional public source/);
    }
  });

  it("does not label legacy mixed-source records as company-published", () => {
    const hppFoodServices = getPlantBySlug("hpp-food-services");
    expect(hppFoodServices).toBeDefined();
    expect(hppFoodServices?.claimSource).toBeUndefined();
    expect(claimSourceLabel(hppFoodServices!)).toBe("Public sources listed below");
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

  it("paginates within the 15–20-card target and retains a global start index", () => {
    const all = filterPlants({});
    const first = paginatePlants(all, 1);
    const second = paginatePlants(all, 2);
    expect(DIRECTORY_PAGE_SIZE).toBeGreaterThanOrEqual(15);
    expect(DIRECTORY_PAGE_SIZE).toBeLessThanOrEqual(20);
    expect(first.plants).toHaveLength(DIRECTORY_PAGE_SIZE);
    expect(second.startIndex).toBe(DIRECTORY_PAGE_SIZE);
    expect(second.totalCount).toBe(all.length);
  });

  it("only exposes category hubs that have at least one indexable matching profile", () => {
    for (const category of getIndexableProductCategories()) {
      const matches = filterPlants({ category: category.slug }).filter(isPlantIndexable);
      expect(matches.length, category.slug).toBeGreaterThan(0);
    }
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

    expect(plants).toHaveLength(20);
    expect(plants.map((plant) => plant.slug)).toContain("creative-foodworks");
    expect(plants.map((plant) => plant.slug)).not.toContain("acecopack");
    expect(categorySnapshot(plants)).toMatchObject({
      matchingManufacturers: 20,
      publishingMinimums: 2,
      comparableMoqRange: "50–1,000 gallons across 2 published minimums",
      commonProcesses: ["Acidified", "Hot fill", "Cold fill"],
      commonPackaging: ["bottles", "jars", "pouches"],
      states: ["CO", "DE", "FL", "GA", "IN", "MI", "NH", "NJ", "NY", "PA", "TX", "VA", "WI"],
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
    expect(disclosed).toContain("st-cousair");
    expect(disclosed).toContain("oregon-trail-mountain-spring-water");
  });

  it("shares and combines the sourced small-run signal filter without inferring friendliness", () => {
    const query = parseDirectoryQuery({ smallRun: "1", category: "spices-dry-mixes", state: "TX" });
    expect(query).toMatchObject({ smallRunSignal: true, category: "spices-dry-mixes", state: "TX" });
    expect(queryToSearchParams(query).toString()).toContain("smallRun=1");

    const matches = filterPlants({ smallRunSignal: true });
    for (const slug of ["amigos-canning-co-amigos-foods", "consolidated-mills-inc"]) {
      const plant = matches.find((candidate) => candidate.slug === slug);
      expect(plant, slug).toBeDefined();
      expect(smallRunSignalForPlant(plant!)?.evidence).toMatch(/small-batch/i);
      expect(smallRunSignalForPlant(plant!)?.sourceUrls[0]).toMatch(/^https:\/\//);
      expect(smallRunSignalForPlant(plant!)?.evidence).not.toMatch(/beginner-friendly|small-run friendly/i);
    }
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
