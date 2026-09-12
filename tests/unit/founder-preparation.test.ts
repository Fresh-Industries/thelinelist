import { describe, expect, it } from "vitest";
import { calculateRunCosts, checklistItemId, costWorksheetSchema, emptyCostWorksheet } from "@/lib/sourcing/preparation";
import { applyPreparationUpdate, createWorkspace } from "@/lib/sourcing/workspace";
import { ProductPlanSchema, productPlanFromWorkspace } from "@/lib/sourcing/product-plan";
import { buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import { prepareOutreachDrafts } from "@/lib/sourcing/outreach";
import { filterPlants, matchesQuery, parseDirectoryQuery, queryToSearchParams } from "@/lib/directory";
import { getCornerstoneGuide } from "@/lib/guides/cornerstones";
import { matchesDirectoryHelp } from "@/lib/directory/service-help";

describe("first-run cost estimates", () => {
  it("keeps missing costs and quantities unknown instead of showing a complete zero-dollar run", () => {
    expect(calculateRunCosts(emptyCostWorksheet())).toMatchObject({ subtotal: null, unitCost: null, complete: false, amountLeft: null });
    const partial = calculateRunCosts({ ...emptyCostWorksheet(), quantity: 1000, ingredients: .5, sellingPrice: 3 });
    expect(partial).toMatchObject({ subtotal: 500, unitCost: .5, complete: false, amountLeft: null });
    expect(partial.missing).toContain("Freight");
  });

  it("distinguishes per-unit costs from whole-run costs and recalculates a quantity scenario", () => {
    const input = { ...emptyCostWorksheet(), quantity: 1000, ingredients: .5, packaging: .6, manufacturing: .4, setup: 300, freight: 200, storage: 0, other: 0, sellingPrice: 3 };
    expect(calculateRunCosts(input)).toMatchObject({ subtotal: 2000, unitCost: 2, complete: true, amountLeft: 1, missing: [] });
    expect(calculateRunCosts({ ...input, quantity: 2000 })).toMatchObject({ subtotal: 3500, unitCost: 1.75 });
    expect(input.quantity).toBe(1000);
    expect(calculateRunCosts({ ...input, sellingPrice: 1 })).toMatchObject({ amountLeft: -1 });
  });

  it("accepts explicit zero costs and rejects invalid quantity and monetary values", () => {
    const base = emptyCostWorksheet();
    for (const quantity of [0, -1, 1.5, Infinity]) expect(costWorksheetSchema.safeParse({ ...base, quantity }).success).toBe(false);
    for (const ingredients of [-1, NaN, Infinity, 1e10]) expect(costWorksheetSchema.safeParse({ ...base, ingredients }).success).toBe(false);
    expect(costWorksheetSchema.safeParse({ ...base, ingredients: 0 }).success).toBe(true);
    expect(costWorksheetSchema.safeParse({ ...base, quantity: 100_000_000, ingredients: 1_000_000_000 }).success).toBe(false);
  });
});

describe("one private founder plan", () => {
  it("round trips learning and costs through the canonical schema without changing product requirements", () => {
    const original = createWorkspace({ idea: "A sauce idea", startingStage: "idea" });
    const checklist = getCornerstoneGuide("start-hot-sauce")!.checklist;
    const saved = applyPreparationUpdate(applyPreparationUpdate(original, { checklist: { guideSlug: "start-hot-sauce", completedItemIds: [checklistItemId(checklist[0])] } }), { costWorksheet: { ...emptyCostWorksheet(), quantity: 1000, notes: "PRIVATE_COST_NOTE" } });
    expect(saved.fields).toEqual(original.fields);
    expect(saved.revision).toBe(original.revision + 2);
    expect(ProductPlanSchema.parse(productPlanFromWorkspace(saved)).preparation).toEqual(saved.preparation);
    expect(buildSourcingAgentState(saved).privatePreparation.costWorksheet?.notes).toBe("PRIVATE_COST_NOTE");
    const drafts = prepareOutreachDrafts(saved, { selectedManufacturerIds: [filterPlants({ help: "production" }).find((plant) => !plant.introductionsPaused)!.slug] });
    expect(drafts).toHaveLength(1);
    expect(JSON.stringify(drafts)).not.toContain("PRIVATE_COST_NOTE");
    expect(drafts[0].packet.fieldValues).not.toHaveProperty("preparation");
  });

  it("loads existing product plans with empty preparation and does not transfer checks to rewritten items", () => {
    const plan = productPlanFromWorkspace(createWorkspace());
    const legacy = { ...plan, preparation: undefined };
    expect(ProductPlanSchema.parse(legacy).preparation).toEqual({ stage: null, checklists: {}, costWorksheet: null });
    expect(checklistItemId("Old decision")).not.toBe(checklistItemId("Different decision"));
  });
});

describe("manufacturer help intent", () => {
  it("separates recorded production services and shared kitchens without including unknown services", () => {
    const plants = filterPlants({});
    const kitchen = plants.find((plant) => plant.operationType === "shared-kitchen-incubator")!;
    expect(kitchen).toBeDefined();
    expect(matchesQuery(kitchen, { help: "production" })).toBe(false);
    expect(matchesQuery(kitchen, { help: "kitchen" })).toBe(true);
    expect(matchesDirectoryHelp({ ...kitchen, operationType: undefined }, "production")).toBe(false);
    expect(matchesDirectoryHelp({ ...kitchen, operationType: "contract-packager" }, "production")).toBe(false);
    expect(filterPlants({ help: "production" }).every((plant) => plant.operationType !== "shared-kitchen-incubator")).toBe(true);
  });

  it("preserves intent with filters, pagination, and URL round trips", () => {
    const query = { help: "production" as const, category: "sauce" as const, page: 2 };
    expect(parseDirectoryQuery(Object.fromEntries(queryToSearchParams(query)))).toMatchObject(query);
    expect(parseDirectoryQuery({ help: "invented" }).help).toBeUndefined();
    expect(filterPlants(query).every((plant) => matchesQuery(plant, { category: "sauce" }) && matchesDirectoryHelp(plant, "production"))).toBe(true);
  });
});
