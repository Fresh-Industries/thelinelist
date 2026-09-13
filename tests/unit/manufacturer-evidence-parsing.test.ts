import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkspace, applyFounderFieldUpdate } from "@/lib/sourcing/workspace";
import { getSourcingWorkspace, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { compareProductionVolume, matchManufacturerRecords } from "@/lib/sourcing/matching";
import { getPlantBySlug, matchesQuery, smallRunSignalForPlant } from "@/lib/directory";
import { mapProcesses } from "@/scripts/import-manufacturers.mjs";
import { publishedCapabilityStatus } from "@/lib/directory/capability-evidence.mjs";
import { publishedSmallRunOption } from "@/lib/directory/small-runs.mjs";
import programReviews from "@/data/manufacturer-imports/small-run-program-reviews-2026-09-13.json";
import type { Plant } from "@/lib/directory/types";
import type { SourcingFieldKey } from "@/lib/sourcing/types";

vi.mock("@/lib/db/prisma", () => ({ databaseConfigured: () => false, prisma: {} }));
vi.mock("@vercel/blob", () => ({ BlobNotFoundError: class extends Error {}, get: vi.fn(), put: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
const compare = (request: string, minimum: string) => compareProductionVolume(request, null, "Glass bottle", minimum)?.compatible ?? null;
const urls = ["https://example.com/copacking"];
function founder(idea = "Hot sauce in glass bottles. Initial order 1000 bottles.") {
  let workspace = createWorkspace({ idea });
  for (const [key, value] of Object.entries({ product_type: "Hot sauce", product_format: "Pourable sauce", formula_status: "Recipe ready", packaging_format: "Glass bottle", manufacturing_process: "Hot-fill" })) {
    workspace = applyFounderFieldUpdate(workspace, { key: key as SourcingFieldKey, value, status: "confirmed" });
  }
  return workspace;
}
function plant(capabilities = "Hot-fill is available.", minimum: string | null = null): Plant {
  const processes = mapProcesses({ manufacturing_capabilities: capabilities }) as Plant["processes"];
  return { ...getPlantBySlug("creative-foodworks")!, manufacturingCapabilitiesPublished: capabilities, productTypesPublished: "Hot sauce", packaging: "Glass bottles", moqDisplay: minimum, rawCapabilityTags: [], rawProductTags: [], overview: [], certs: [], processes, finderProcesses: processes as Plant["finderProcesses"] };
}

describe("allocation survives intake, storage and matching", () => {
  it.each([["runs", "run"], ["orders", "order"], ["batches", "batch"], ["SKUs", "SKU"], ["products", "product"], ["flavors", "flavor"]])("retains the total across %s without assuming equal allocation", async (plural, scope) => {
    vi.stubEnv("NODE_ENV", "development");
    const workspace = founder(`Hot sauce in glass bottles. Initial order 1,000 bottles across 4 ${plural}.`);
    await saveSourcingWorkspace(workspace, null);
    const saved = (await getSourcingWorkspace(workspace.id))!;
    expect(saved.fields.production_volume.value).toBe(`1,000 bottles across 4 ${plural}`);
    const match = matchManufacturerRecords(saved, [plant("Hot-fill is available.", `Minimum 500 bottles per ${scope}`)])[0];
    expect(match.reasonTrace?.find((r) => r.requirementKey === "production_volume")?.outcome).toBe("unknown");
    expect(match.possibleConflicts.join(" ")).not.toMatch(/below.*minimum/);
  });
  it("does not divide an apparently sufficient total equally", () => expect(compare("4000 bottles across 4 runs", "Minimum 500 bottles per run")).toBeNull());
  it.each(["each flavor", "for each SKU", "per-SKU", "for every product", "each batch", "per order", "per-run"])("preserves intake allocation %s", (scope) => {
    const workspace = founder(`Hot sauce. Initial order 1000 bottles ${scope}.`);
    expect(workspace.fields.production_volume.value).toBe(`1000 bottles ${scope}`);
  });
});

describe("offer and scope bound minimum constraints", () => {
  it.each([
    ["Pilot 1000 bottles", "Commercial minimum 100 bottles, pilot minimum 5000 bottles", false],
    ["Pilot 6000 bottles", "Commercial minimum 100 bottles, pilot minimum 5000 bottles", true],
    ["1000 bottles", "Minimum 500 bottles; pilot minimum 100 bottles", true],
    ["100 bottles", "Minimum 500 bottles; pilot minimum 100 bottles", false],
    ["Pilot 1000 bottles", "Minimum 5000 bottles; pilot minimum 100 bottles", true],
    ["Pilot 1000 bottles", "Minimum 500 bottles for commercial production and minimum 5000 bottles for pilot runs", false],
    ["1000 bottles per flavor", "Commercial minimum 500 bottles per flavor and minimum 2000 bottles per order", null],
    ["1000 bottles per flavor", "Commercial minimum 500 bottles per flavor and minimum 2000 bottles per flavor", false],
    ["1000 bottles", "Commercial minimum 500 bottles and minimum 2000 jars", null],
    ["Pilot 1000 bottles", "Pilot or commercial minimum 500 bottles", null],
    ["1000 bottles per flavor", "Minimum 500 bottles per flavor, 2000 bottles per flavor", false],
    ["1000 bottles per flavor", "Minimum 500 bottles per flavor, 2000 bottles per order", null],
    ["Pilot 1000 bottles", "Pilot minimum 500 bottles per run, 2000 bottles per run", false],
    ["1000 bottles", "500 bottles minimum", true],
    ["1000 bottles", "MOQ 500 bottles", true],
    ["1000 bottles per flavor and 2000 bottles per order", "Minimum 1500 bottles per order", null],
    ["1000 bottles", "Minimum 500 bottles, 2000 bottles", null],
  ] as const)("%s against %s => %s", (request, minimum, expected) => expect(compare(request, minimum)).toBe(expected));
  it.each([["each flavor", "flavors"], ["for each SKU", "SKUs"], ["per-SKU", "SKUs"], ["every product", "products"], ["each run", "runs"], ["for every batch", "batches"], ["per-order", "orders"]])("normalizes %s without discarding allocation", (scope, plural) => {
    expect(compare(`1000 bottles across 4 ${plural}`, `Minimum 500 bottles ${scope}`)).toBeNull();
    expect(compare(`1000 bottles ${scope}`, `Minimum 500 bottles ${scope}`)).toBe(true);
    expect(compare(`100 bottles ${scope}`, `Minimum 500 bottles ${scope}`)).toBe(false);
  });
});

describe("capability clause polarity across import, filters and sourcing", () => {
  it.each([
    ["Hot-fill is not offered.", "mismatch"],
    ["We do not offer cold-fill, but hot-fill is available.", "supported"],
    ["Hot-fill is unavailable; cold-fill is available.", "mismatch"],
    ["Hot-fill is not confirmed.", "unknown"],
    ["Hot-fill is available. Hot-fill is not offered.", "conflicting"],
    ["We do not offer cold-fill. Hot-fill production is available.", "supported"],
    ["No cold-fill or hot-fill is offered.", "mismatch"],
    ["Cold-fill is not offered, hot-fill is available.", "supported"],
    ["Hot-fill and cold-fill are not offered.", "mismatch"],
    ["Hot-fill, cold-fill and aseptic processing are not offered.", "mismatch"],
    ["We do not offer cold-fill and hot-fill is available.", "supported"],
    ["Hot-fill is offered and cold-fill is not available.", "supported"],
    ["Hot-fill and cold-fill are available.", "supported"],
  ] as const)("%s => %s", (claim, status) => {
    expect(publishedCapabilityStatus(claim, ["hot-fill", "hot fill"])).toBe(status);
    const record = plant(claim);
    expect(record.finderProcesses.includes("hot-fill")).toBe(status === "supported");
    expect(matchesQuery(record, { process: "hot-fill" })).toBe(status === "supported");
    const match = matchManufacturerRecords(founder(), [record])[0];
    expect(match.reasonTrace?.find((item) => item.requirementKey === "manufacturing_process")?.outcome).toBe(status === "mismatch" || status === "conflicting" ? "conflict" : status);
  });
  it("ranks actual support then unknown ahead of an explicit exclusion", () => {
    const records = [plant("Hot-fill is not offered."), plant("Hot-fill is not confirmed."), plant("We do not offer cold-fill, but hot-fill is available.")].map((record, i) => ({ ...record, slug: `polarity-${i}`, name: `Polarity ${i}` }));
    expect(matchManufacturerRecords(founder(), records).map((m) => m.manufacturerSlug)).toEqual(["polarity-2", "polarity-1", "polarity-0"]);
  });
});

describe("external production programs", () => {
  it("keeps every reviewed program consistent between generated catalog and directory filtering", () => {
    for (const [slug, review] of Object.entries(programReviews.records)) {
      const record = getPlantBySlug(slug)!;
      expect(record, slug).toBeTruthy();
      const signal = smallRunSignalForPlant(record);
      expect(record.smallRunSignal, slug).toEqual(signal);
      expect(Boolean(signal), slug).toBe(review.decision !== "needs-verification");
      expect(matchesQuery(record, { smallRunSignal: true }), slug).toBe(Boolean(signal));
    }
  });
  it("does not transfer own-brand batch sizes to a separate client program", () => {
    const food = getPlantBySlug("food-for-thought")!;
    expect(publishedSmallRunOption(food.manufacturingCapabilitiesPublished, food.moqDisplay, food.smallRunSignal?.sourceUrls ?? urls)).toBeUndefined();
    expect(publishedSmallRunOption("Our brand makes jam in small batches. Contract manufacturing is also available.", null, urls)).toBeUndefined();
  });
  it("keeps Blackberry Patch's own-formula/custom-label restriction across sentences", () => {
    const option = smallRunSignalForPlant(getPlantBySlug("blackberry-patch")!);
    expect(option?.kind).toBe("private-label");
    expect(option?.evidence).toMatch(/custom labels|their.*products/i);
    expect(option?.evidence).toContain("10 cases");
  });
  it("uses Food for Thought's actual external program without replacing the old source date", () => {
    const food = getPlantBySlug("food-for-thought")!;
    const option = smallRunSignalForPlant(food);
    expect(option?.kind).toBe("small-batch");
    expect(option?.evidence).toMatch(/1,200 units per product/);
    expect(option?.evidence).not.toContain("240");
    expect(option?.sourceUrls).toContain("https://foodforthought.net/pages/build-your-brand-with-us");
    expect(option?.reviewedAt).toBe("2026-09-13");
    expect(food.lastVerified).toBe("2026-08-26");
  });
  it("retains externally offered pilot and commercial small-batch positive controls", () => {
    expect(publishedSmallRunOption("We offer small-batch co-packing of customer recipes.", null, urls)?.kind).toBe("small-batch");
    expect(publishedSmallRunOption("Contract manufacturing services. Pilot runs for customer formulas.", null, urls)?.kind).toBe("pilot");
    expect(publishedSmallRunOption("Our product, your label. Small batches of our own formulas are offered with custom labels.", null, urls)?.kind).toBe("private-label");
    expect(publishedSmallRunOption("Small-batch co-packing is not offered.", null, urls)).toBeUndefined();
  });
  it("keeps own-formula restrictions even when the paragraph also says co-packing", () => {
    expect(publishedSmallRunOption("Small-batch co-packing of our own formulas. Private-label products with custom labels only.", null, urls)?.kind).toBe("private-label");
    expect(publishedSmallRunOption("Our own recipes are made in small batches. Contract manufacturing is also available.", null, urls)).toBeUndefined();
    expect(publishedSmallRunOption("Private-label products use our own formulas. We separately offer small-batch co-packing of customer recipes.", null, urls)?.kind).toBe("small-batch");
  });
});
