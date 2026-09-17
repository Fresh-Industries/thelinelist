import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { createWorkspace, applyFounderFieldUpdate } from "@/lib/sourcing/workspace";
import { getSourcingWorkspace, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { compareProductionVolume, matchManufacturerRecords } from "@/lib/sourcing/matching";
import { getPlantBySlug, matchesQuery, smallRunSignalForPlant } from "@/lib/directory";
import { mapProcesses } from "@/scripts/import-manufacturers.mjs";
import { publishedCapabilityStatus } from "@/lib/directory/capability-evidence.mjs";
import { publishedSmallRunOption } from "@/lib/directory/small-runs.mjs";
import { prepareOutreachDrafts } from "@/lib/sourcing/outreach";
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
  it.each([
    ["total, and my budget is $10,000", "total"],
    ["total and my budget is $10,000", "total"],
    ["total across seven runs, and my budget is $10,000", "total across seven runs"],
    ["per run and my internal target is $10,000", "per run"],
    ["split according to demand, and my budget is $10,000", "split according to demand"],
  ])("keeps unrelated private facts out of quantity evidence and packets: %s", async (context, allocation) => {
    vi.stubEnv("NODE_ENV", "development");
    const workspace = founder(`Hot sauce. Initial order 1000 bottles ${context}.`);
    await saveSourcingWorkspace(workspace, null);
    const saved = (await getSourcingWorkspace(workspace.id))!;
    expect(saved.fields.production_volume.value).toBe(`1000 bottles ${allocation}`);
    expect(saved.fields.production_volume.sourceSpans?.[0].text).not.toMatch(/budget|internal|10,000/);
    saved.matches = matchManufacturerRecords(saved, [plant()]);
    const [draft] = prepareOutreachDrafts(saved, { selectedManufacturerIds: [saved.matches[0].manufacturerSlug] });
    expect(JSON.stringify(draft.packet.fieldValues)).not.toMatch(/budget|internal|10,000/);
    if (allocation === "split according to demand") {
      expect(saved.fields.production_volume.shareWithManufacturer).toBe(false);
      expect(draft.includedFieldKeys).not.toContain("production_volume");
    }
  });
  it.each([
    ["total across 4 runs", "run"],
    ["across 4 production runs", "run"],
    ["across seven runs", "run"],
    ["in total across twelve batches", "batch"],
    ["total across 4 orders", "order"],
    ["total across 4 SKUs", "SKU"],
    ["total across 4 products", "product"],
    ["total across 4 flavors", "flavor"],
    ["split among seven production runs", "run"],
    ["distributed across several batches", "batch"],
    ["across an undecided number of production runs", "run"],
    ["split according to demand", "run"],
  ])("preserves quantity context %s through source spans, storage and matching", async (suffix, scope) => {
    vi.stubEnv("NODE_ENV", "development");
    const quantity = `1000 bottles ${suffix}`;
    const idea = `Hot sauce. Initial order ${quantity}.`;
    const workspace = founder(idea);
    await saveSourcingWorkspace(workspace, null);
    const saved = (await getSourcingWorkspace(workspace.id))!;
    const field = saved.fields.production_volume;
    expect(field.value).toBe(quantity);
    expect(field.sourceSpans?.[0].text).toContain(quantity);
    for (const span of field.sourceSpans ?? []) expect(idea.slice(span.start, span.end)).toBe(span.text);
    expect(compare(field.value!, `Minimum 500 bottles per ${scope}`)).toBeNull();
    const match = matchManufacturerRecords(saved, [plant("Hot-fill is available.", `Minimum 500 bottles per ${scope}`)])[0];
    expect(match.reasonTrace?.find((r) => r.requirementKey === "production_volume")?.outcome).toBe("unknown");
  });
  it.each(["per run", "per production run", "for each production run", "every batch"])("keeps an explicit %s quantity comparable after reload", async (suffix) => {
    vi.stubEnv("NODE_ENV", "development");
    const workspace = founder(`Hot sauce. Initial order 1000 bottles ${suffix}.`);
    await saveSourcingWorkspace(workspace, null);
    const saved = (await getSourcingWorkspace(workspace.id))!;
    expect(saved.fields.production_volume.value).toBe(`1000 bottles ${suffix}`);
    expect(compare(saved.fields.production_volume.value!, `Minimum 500 bottles ${suffix}`)).toBe(true);
  });
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
  it.each(["SKU", "run", "batch", "order", "product", "flavor"])("preserves a published single %s minimum", (scope) => {
    const minimum = `Minimum 500 bottles for one ${scope}`;
    expect(compare(`1000 bottles across 4 ${scope === "batch" ? "batches" : `${scope}s`}`, minimum)).toBeNull();
    expect(compare(`1000 bottles for one ${scope}`, minimum)).toBe(true);
    expect(compare(`100 bottles for one ${scope}`, minimum)).toBe(false);
  });
  it.each(["no order minimum", "no minimum per order", "no minimum order required"])("does not turn %s into an unknown numeric floor", (absence) => {
    expect(compare("1000 bottles per flavor", `Minimum 500 bottles per flavor; ${absence}`)).toBe(true);
    expect(compare("100 bottles per flavor", `Minimum 500 bottles per flavor; ${absence}`)).toBe(false);
  });
  it("keeps unpublished order minimums distinct from explicit no-minimum terms", () => {
    expect(compare("1000 bottles per flavor", "Minimum 500 bottles per flavor; no order minimum is published")).toBeNull();
    expect(compare("1000 bottles per flavor", "Minimum 500 bottles per flavor; order minimum unknown")).toBeNull();
  });
  it.each([
    "Minimum 500 bottles and 2000 bottles",
    "Minimum 500 bottles, 2000 bottles",
    "Minimum 500 bottles or 2000 bottles",
    "Minimum 500 bottles plus 2000 bottles",
    "Minimum 500 bottles and 2000 jars",
  ])("does not use an unbound quantity from %s", (minimum) => {
    expect(compare("1000 bottles", minimum)).toBeNull();
    expect(compare("3000 bottles", minimum)).toBeNull();
  });
  it.each([
    ["1000 bottles per run", "Minimum 500 bottles per run and 2000 bottles per run", false],
    ["3000 bottles per run", "Minimum 500 bottles per run and 2000 bottles per run", true],
    ["1000 bottles", "Minimum 500 bottles and minimum 2000 bottles", false],
    ["3000 bottles", "Minimum 500 bottles and minimum 2000 bottles", true],
    ["Private-label 1000 bottles", "Private-label minimum 500 bottles and commercial minimum 2000 bottles", true],
    ["1000 bottles", "Private-label minimum 500 bottles and commercial minimum 2000 bottles", false],
  ] as const)("preserves bound constraints: %s against %s", (request, minimum, expected) => expect(compare(request, minimum)).toBe(expected));
  it("retains published case-pack and equivalent-yield context", () => {
    expect(compare("1200 bottles", "Minimum 100 cases of 12 bottles")).toBe(true);
    expect(compare("1000 bottles", "Minimum 100 cases of 12 bottles")).toBe(false);
    expect(compare("1200 bottles", "Minimum 100 cases, 12 bottles per case")).toBe(true);
    expect(compareProductionVolume("4000 bottles", "5 fl oz", "Glass bottle", "Minimum 150 gallons (approximately 1,100 bottles at 16 fl oz)")?.compatible).toBe(true);
    expect(compareProductionVolume("1000 bottles", "5 fl oz", "Glass bottle", "Minimum 150 gallons (approximately 1,100 bottles at 16 fl oz)")?.compatible).toBe(false);
  });
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
    ["We don't use preservatives, hot-fill is available.", "supported"],
    ["We do not use preservatives and hot-fill is available.", "supported"],
    ["We use no preservatives, hot-fill is available.", "supported"],
    ["We don't offer hot-fill, cold-fill is available.", "mismatch"],
    ["We do not yet offer hot-fill.", "mismatch"],
    ["Hot-fill is not yet offered.", "mismatch"],
    ["Hot-fill is not yet confirmed.", "unknown"],
    ["We have not yet confirmed hot-fill.", "unknown"],
    ["Hot-fill isn't yet available.", "mismatch"],
    ["We do not yet offer cold-fill, but hot-fill is available.", "supported"],
    ["Cold-fill is not yet offered. Hot-fill is available.", "supported"],
    ["Cold-fill is not offered, yet hot-fill is available.", "supported"],
    ["Hot-fill is available, yet cold-fill is not offered.", "supported"],
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
  it("does not mistake literal seed products for unresolved source metadata", () => {
    expect(publishedSmallRunOption("Small-batch co-packing for seed products", null, urls)?.kind).toBe("small-batch");
  });
  it("keeps unsupported historical source claims unknown without suppressing seed products", () => {
    const claim = getPlantBySlug("hno-blending-solutions")!.manufacturingCapabilitiesPublished!;
    expect(publishedCapabilityStatus(claim, ["acidified"])).toBe("unknown");
    expect(mapProcesses({ manufacturing_capabilities: claim })).not.toContain("acidified");
  });
  it.each([
    "We do not yet offer small-batch co-packing.",
    "Small-batch co-packing is not yet offered.",
    "Small-batch co-packing is not yet confirmed.",
  ])("does not publish a small-run label for %s", (claim) => {
    expect(publishedSmallRunOption(claim, null, urls)).toBeUndefined();
    const record = { ...plant(claim), slug: "temporal-negation", smallRunSignal: undefined };
    expect(smallRunSignalForPlant(record)).toBeUndefined();
    expect(matchesQuery(record, { smallRunSignal: true })).toBe(false);
  });
  it("keeps genuine contrasts between external production programs", () => {
    expect(publishedSmallRunOption("We do not offer pilot runs, yet small-batch co-packing is available.", null, urls)?.kind).toBe("small-batch");
  });
  it("keeps Consolidated Mills limited to its reviewed private-label catalog recipes", () => {
    const record = getPlantBySlug("consolidated-mills-inc")!;
    for (const signal of [record.smallRunSignal, smallRunSignalForPlant(record)]) {
      expect(signal?.kind).toBe("private-label");
      expect(signal?.evidence).toMatch(/private[- ]label/i);
      expect(signal?.evidence).toMatch(/library of proven recipes under customer label/i);
      expect(signal?.evidence).toMatch(/small-batch production runs for test items/i);
      expect(signal?.evidence).not.toMatch(/food contract packaging/i);
    }
    expect(record.lastVerified).toBe("2026-08-26");
    expect(record.moqDisplay).toBeNull();
  });
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

it("rejects impossible review dates before writing an audit", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-directory-trust.mjs", "--reviewed-at=2026-02-31"], { encoding: "utf8" });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Review date must be a real calendar date");
});
