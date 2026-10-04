import { getPlantBySlug } from "@/lib/directory";
import { normalizeCertificationRequirements } from "@/lib/sourcing/certification-requirements";
import { compareProductionVolume, matchManufacturerRecords } from "@/lib/sourcing/matching";
import { prepareOutreachDrafts } from "@/lib/sourcing/outreach";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import { applyAgentUpdates, applyFounderConversationAnswer, applyFounderFieldUpdate, applyManufacturerResearch, createWorkspace, undoLastAgentChange } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

describe("founder input integrity", () => {
  it("keeps certification priorities local in a natural comma-separated answer", () => {
    expect(normalizeCertificationRequirements("SQF required, organic not required, kosher undecided")).toEqual({
      required: ["SQF"], preferred: [], negated: ["Organic"], unknown: ["Kosher"],
    });
    expect(normalizeCertificationRequirements("SQF and organic required, kosher preferred")).toEqual({
      required: ["Organic", "SQF"], preferred: ["Kosher"], negated: [], unknown: [],
    });
  });

  it("honors the latest explicit certification correction and round-trips grouped priorities", () => {
    expect(normalizeCertificationRequirements("Organic was not required. Correction: organic is required.")).toEqual({
      required: ["Organic"], preferred: [], negated: [], unknown: [],
    });
    expect(normalizeCertificationRequirements("Required: SQF, Organic; Preferred: Kosher, Halal", null)).toEqual({
      required: ["Organic", "SQF"], preferred: ["Kosher", "Halal"], negated: [], unknown: [],
    });
  });

  it("propagates ordinary leading certification intent across a shared list", () => {
    expect(normalizeCertificationRequirements("We need SQF and organic, but kosher is preferred", null)).toEqual({
      required: ["Organic", "SQF"], preferred: ["Kosher"], negated: [], unknown: [],
    });
    expect(normalizeCertificationRequirements("We need SQF and organic, kosher optional", null)).toEqual({
      required: ["Organic", "SQF"], preferred: ["Kosher"], negated: [], unknown: [],
    });
    expect(normalizeCertificationRequirements("No organic and kosher certification required", null)).toEqual({
      required: [], preferred: [], negated: ["Organic", "Kosher"], unknown: [],
    });
    expect(normalizeCertificationRequirements("No organic and kosher is required", null)).toEqual({
      required: ["Kosher"], preferred: [], negated: ["Organic"], unknown: [],
    });
    expect(normalizeCertificationRequirements("We need SQF and organic preferred", null)).toEqual({
      required: ["SQF"], preferred: ["Organic"], negated: [], unknown: [],
    });
  });

  it("does not confirm explicitly rejected package or recipe facts during creation", () => {
    const idea = "I want hot sauce. I do not want a 5 oz glass bottle. I do not have a finished kitchen recipe.";
    const workspace = createWorkspace({ idea });
    for (const key of ["packaging_format", "packaging_size", "formula_status"] as const) {
      expect(workspace.fields[key]).toMatchObject({ value: null, status: "unknown" });
    }
  });

  it("preserves a stated first-run range rather than confirming only its upper endpoint", () => {
    const idea = "I want hot sauce in a 5 oz glass bottle. First run about 5,000 to 10,000 bottles.";
    const workspace = createWorkspace({ idea });
    expect(workspace.fields.production_volume.value).toBe("About 5,000 to 10,000 bottles");
    for (const span of workspace.fields.production_volume.sourceSpans ?? []) {
      expect(idea.slice(span.start, span.end)).toBe(span.text);
    }
  });

  it("captures an explicit recipe-development request without inventing recipe readiness", () => {
    const workspace = createWorkspace({ idea: "QA fictional project: I want to make a mango sparkling drink in 12 oz cans, starting with 10,000 cans in Texas. I need help developing the recipe. Organic certification is not required." });
    expect(workspace.fields.formulation_assistance).toMatchObject({ value: "Required", status: "confirmed" });
    expect(workspace.fields.formula_status).toMatchObject({ value: null, status: "unknown" });
  });

  it("preserves the requested product description when an answer also yields other explicit details", () => {
    const answer = "Mango sparkling drink for grocery shoppers; recipe development and shelf-life validation are still needed.";
    const workspace = applyFounderConversationAnswer(createWorkspace({ idea: "A sparkling drink." }), {
      answeringKey: "product_description", text: answer,
    });
    expect(workspace.fields.product_description).toMatchObject({
      value: answer, status: "confirmed", updatedBy: "founder", source: "Founder conversation answer",
      sourceSpans: [{ start: 0, end: answer.length, text: answer }],
    });
    expect(workspace.fields.formulation_assistance.value).toBe("shelf-life review needed");
  });

  it.each([
    "Mango drink for grocery shoppers; shelf-life testing needed; my budget is $10,000 and must remain private.",
    "Mango drink for grocery shoppers; do not share this description with manufacturers.",
    "Mango drink for grocery shoppers; our target unit cost is 70 cents.",
  ])("preserves a sensitive answer privately and excludes it from manufacturer drafts and packets", (answer) => {
    const workspace = applyFounderConversationAnswer(createWorkspace({ idea: "A mango drink." }), {
      answeringKey: "product_description", text: answer,
    });
    expect(workspace.fields.product_description).toMatchObject({ value: answer, status: "confirmed", shareWithManufacturer: false });
    const [draft] = prepareOutreachDrafts(workspace, { selectedManufacturerIds: ["better-beverage-company"] });
    expect(draft.includedFieldKeys).not.toContain("product_description");
    expect(draft.packet.fieldValues.product_description).toBeUndefined();
    expect(draft.body).not.toMatch(/\$10,000|budget|70 cents|do not share/i);
    expect(JSON.stringify(draft.packet)).not.toMatch(/\$10,000|budget|70 cents|do not share/i);
  });

  it("preserves a recipe-stage answer alongside extracted certification details", () => {
    const answer = "We have a draft recipe that still needs development; SQF preferred.";
    const workspace = applyFounderConversationAnswer(createWorkspace({ idea: "A beverage." }), {
      answeringKey: "formula_status", text: answer,
    });
    expect(workspace.fields.formula_status).toMatchObject({ value: answer, status: "confirmed" });
    expect(workspace.fields.certifications.value).toBe("Preferred: SQF");
  });

  it.each(["I don't know yet", "I don’t know", "Undecided", "TBD", "I haven't decided yet"])("keeps %s open in the canonical state and readiness", (answer) => {
    let workspace = createWorkspace({ idea: "A beverage." });
    workspace = applyFounderConversationAnswer(workspace, { answeringKey: "production_volume", text: answer });
    expect(workspace.fields.production_volume).toMatchObject({ status: "needs_decision", shareWithManufacturer: false });
    expect(getSourcingReadiness(workspace).confirmedRequirements).not.toContain("production_volume");
  });

  it("does not treat non-carbonated as a request for carbonation", () => {
    let workspace = createWorkspace({ idea: "A beverage." });
    workspace = applyFounderFieldUpdate(workspace, { key: "carbonation", value: "Non-carbonated", status: "confirmed", shareWithManufacturer: true });
    const plant = getPlantBySlug("better-beverage-company")!;
    const carbonatedOnly = {
      ...plant,
      manufacturingCapabilitiesPublished: "Contract manufacturing of carbonated beverages only.",
      rawCapabilityTags: [],
      overview: [],
      processes: [],
    };
    expect(matchManufacturerRecords(workspace, [carbonatedOnly], {
      requiredRequirements: ["carbonation"], resultLimit: 3,
    })).toEqual([]);
  });

  it("keeps a first-run range unknown until the quantity and allocation are clarified", () => {
    let workspace = createWorkspace({ idea: "Hot sauce in a 5 oz glass bottle. First run 5,000 to 10,000 bottles." });
    workspace = applyFounderFieldUpdate(workspace, { key: "production_volume", value: "5,000 to 10,000 bottles", status: "confirmed", shareWithManufacturer: true });
    const plant = { ...getPlantBySlug("creative-foodworks")!, moqDisplay: "Minimum 8,000 bottles" };
    const [match] = matchManufacturerRecords(workspace, [plant], { preferredRequirements: ["production_volume"], resultLimit: 3 });
    expect(match.unknowns).toEqual(expect.arrayContaining([expect.stringContaining("Confirm a first-run quantity with units")]));
    expect(match.supportedMatches.join(" ")).not.toMatch(/meets the published 8,000 bottles minimum/);
    expect(matchManufacturerRecords(workspace, [plant], { requiredRequirements: ["production_volume"], resultLimit: 3 })).toEqual([]);
  });

  it.each(["5,000–10,000 bottles", "5,000—10,000 bottles", "5.5 to 10.5 gallons"])("leaves %s unknown without comparing only one endpoint", (quantity) => {
    expect(compareProductionVolume(quantity, "5 oz", "Glass bottle", "Minimum 8,000 bottles")).toMatchObject({ compatible: null });
  });

  it("keeps a denied still-production capability as a mismatch and contradictory claims as conflicts", () => {
    let workspace = createWorkspace({ idea: "A beverage." });
    workspace = applyFounderFieldUpdate(workspace, { key: "carbonation", value: "Non-carbonated", status: "confirmed", shareWithManufacturer: true });
    for (const [capabilities, expected] of [
      ["Contract manufacturing. Does not produce non-carbonated beverages.", "explicitly excludes"],
      ["Contract manufacturing. We produce non-carbonated beverages. Does not produce non-carbonated beverages.", "production conflict"],
    ]) {
      const plant = beverageFixture(capabilities);
      const [match] = matchManufacturerRecords(workspace, [plant], { preferredRequirements: ["carbonation"], resultLimit: 3 });
      expect(match.possibleConflicts.join(" ")).toContain(expected);
      expect(match.supportedMatches.join(" ")).not.toMatch(/non-carbonated production is publicly listed/i);
      expect(matchManufacturerRecords(workspace, [plant], { requiredRequirements: ["carbonation"], resultLimit: 3 })).toEqual([]);
    }
  });

  it.each([
    ["Non-carbonated", "Contract manufacturing. We produce non-carbonated beverages. We make only carbonated beverages."],
    ["Carbonated", "Contract manufacturing. We produce carbonated beverages. We make only non-carbonated beverages."],
  ])("excludes a required %s candidate when another supported statement limits it to the opposite production type", (answer, capabilities) => {
    let workspace = createWorkspace({ idea: "A beverage." });
    workspace = applyFounderFieldUpdate(workspace, { key: "carbonation", value: answer, status: "confirmed", shareWithManufacturer: true });
    const plant = beverageFixture(capabilities);
    const [preferred] = matchManufacturerRecords(workspace, [plant], { preferredRequirements: ["carbonation"], resultLimit: 3 });
    expect(preferred.possibleConflicts.join(" ")).toContain("production conflict");
    expect(preferred.evidence.find((item) => item.requirementKey === "carbonation")?.status).toBe("conflicting");
    expect(preferred.reasonTrace).toContainEqual(expect.objectContaining({ requirementKey: "carbonation", priority: "preferred", outcome: "conflict" }));
    expect(preferred.supportedMatches.join(" ")).not.toMatch(/(?:Carbonation|non-carbonated production) is publicly listed/i);
    expect(matchManufacturerRecords(workspace, [plant], { requiredRequirements: ["carbonation"], resultLimit: 3 })).toEqual([]);
  });

  it.each(["No carbonation", "Uncarbonated"])("uses the same still-production intent for %s in matching and outreach", (answer) => {
    let workspace = createWorkspace({ idea: "A beverage." });
    workspace = applyFounderFieldUpdate(workspace, { key: "carbonation", value: answer, status: "confirmed", shareWithManufacturer: true });
    const supportedPlant = beverageFixture("Contract manufacturing. We produce non-carbonated beverages.");
    const [supported] = matchManufacturerRecords(workspace, [supportedPlant], { requiredRequirements: ["carbonation"], resultLimit: 3 });
    expect(supported.supportedMatches).toContain("Still, non-carbonated production is publicly listed as a capability.");
    const request = { requiredRequirements: [], preferredRequirements: ["carbonation"] as const, resultLimit: 3, geographyPreference: null };
    const [unknown] = matchManufacturerRecords(workspace, [beverageFixture("Contract manufacturing.")], { preferredRequirements: ["carbonation"], resultLimit: 3 });
    workspace = applyManufacturerResearch(workspace, { ...request, preferredRequirements: [...request.preferredRequirements] }, [unknown]);
    const [draft] = prepareOutreachDrafts(workspace, { selectedManufacturerIds: [unknown.manufacturerSlug] });
    expect(draft.questions).toContain("Can the relevant line produce still, non-carbonated beverages?");
  });

  it("preserves a later founder correction while undoing untouched fields from the agent update", () => {
    let workspace = applyAgentUpdates(createWorkspace({ idea: "A beverage." }), [
      { key: "retail_channel", value: "Online", explicitlyStated: false },
      { key: "carbonation", value: "Carbonated", explicitlyStated: false },
    ]);
    const changeId = workspace.lastAgentChange!.id;
    workspace = applyFounderFieldUpdate(workspace, { key: "retail_channel", value: "Independent grocery shops", status: "confirmed", shareWithManufacturer: true });
    expect(workspace.lastAgentChange?.changedKeys).toEqual(["carbonation"]);
    workspace = undoLastAgentChange(workspace, changeId);
    expect(workspace.fields.retail_channel).toMatchObject({ value: "Independent grocery shops", status: "confirmed", updatedBy: "founder" });
    expect(workspace.fields.carbonation).toMatchObject({ value: null, status: "unknown" });
  });

  it("clears a superseded agent change after the founder answers the only affected field", () => {
    let workspace = applyAgentUpdates(createWorkspace({ idea: "A beverage." }), [
      { key: "retail_channel", value: null, explicitlyStated: false },
    ]);
    const changeId = workspace.lastAgentChange!.id;
    workspace = applyFounderConversationAnswer(workspace, { answeringKey: "retail_channel", text: "Independent grocery shops" });
    expect(workspace.lastAgentChange).toBeNull();
    expect(undoLastAgentChange(workspace, changeId).fields.retail_channel.value).toBe("Independent grocery shops");
  });
});

function beverageFixture(capabilities: string) {
  return {
    ...getPlantBySlug("better-beverage-company")!,
    productTypesPublished: "Beverages",
    manufacturingCapabilitiesPublished: capabilities,
    rawProductTags: [],
    rawCapabilityTags: [],
    overview: [],
    processes: [],
  };
}
