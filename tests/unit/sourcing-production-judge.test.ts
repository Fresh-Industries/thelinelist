import { getPlantBySlug } from "@/lib/directory";
import { normalizeCertificationRequirements } from "@/lib/sourcing/certification-requirements";
import { formatReviewedDate } from "@/lib/sourcing/date-format";
import { matchManufacturerRecords } from "@/lib/sourcing/matching";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import { applyFounderConversationAnswer, applyFounderFieldUpdate, applyManufacturerResearch, createWorkspace } from "@/lib/sourcing/workspace";
import type { ManufacturerResearchBroadeningApproval, SourcingWorkspace } from "@/lib/sourcing/types";
import { describe, expect, it } from "vitest";

const HOT_SAUCE_IDEA = "I want to make a tomato-free smoky carrot hot sauce in a 5 oz glass woozy bottle. I have a finished kitchen recipe, but it needs process-authority review and shelf-life review. I want about 10,000 bottles, prefer Texas or nearby, it should be shelf-stable, and organic certification is not required.";
const MANUAL_INTAKE_PERSONA = "Scratch notes: Maybe call it Northstar Nibbles—actually no, brand is undecided, please do not use that name. I first wrote roasted fava-bean snack, but correction: it is a baked chickpea crisp with rosemary and lemon. 1.5 oz compostable pillow bag if possible. First run 8,000 bags. Cold-chain? No: shelf-stable. Peanut-free is a must. Organic certification is not required. Prefer a Northeast manufacturer, and I need help finalizing the formula. Launch target was 2027-03-15, correction: 2027-04-01.";

describe("production judge sourcing regressions", () => {
  it("extracts only the explicit closed-form facts from the manual hot-sauce intake with source spans", () => {
    const workspace = createWorkspace({ idea: HOT_SAUCE_IDEA });
    const expected = {
      product_type: "Hot sauce",
      product_category: "Sauce / condiment",
      packaging_size: "5 oz",
      packaging_format: "Glass Woozy Bottle",
      production_volume: "About 10,000 bottles",
      preferred_geography: "Texas or nearby",
      storage_distribution: "Shelf-stable",
      formula_status: "Finished kitchen recipe",
      formulation_assistance: "process-authority review and shelf-life review needed",
      certifications: "Not required: Organic",
    } as const;

    for (const [key, value] of Object.entries(expected) as Array<[keyof typeof expected, string]>) {
      const field = workspace.fields[key];
      expect(field).toMatchObject({ value, status: "confirmed", explicitlyStated: true, source: "Founder starting idea" });
      expect(field.sourceSpans?.length).toBeGreaterThan(0);
      for (const span of field.sourceSpans ?? []) expect(HOT_SAUCE_IDEA.slice(span.start, span.end)).toBe(span.text);
    }

    for (const key of ["brand_name", "budget", "manufacturing_process", "target_launch_date", "ingredient_sourcing"] as const) {
      expect(workspace.fields[key]).toMatchObject({ value: null, status: "unknown", explicitlyStated: false });
    }
    expect(workspace.fields.certifications.validationStatus).toBe("not_required");
    expect(getSourcingReadiness(workspace).missingRequirements).not.toContain("certifications");
  });

  it("preserves the complete corrected manual-intake persona without stale alternatives", () => {
    const workspace = createWorkspace({ idea: MANUAL_INTAKE_PERSONA });
    const expected = {
      product_type: "Baked chickpea crisp",
      product_category: "Snack",
      product_description: "Baked chickpea crisp with rosemary and lemon",
      product_format: "1.5 oz pillow bag",
      packaging_format: "Compostable Pillow Bag if production-ready",
      packaging_size: "1.5 oz",
      production_volume: "8,000 bags",
      storage_distribution: "Shelf-stable",
      allergens: "Peanut-free required",
      certifications: "Not required: Organic",
      preferred_geography: "Northeast",
      formulation_assistance: "Required",
      target_launch_date: "2027-04-01",
    } as const;

    expect(workspace.fields.brand_name).toMatchObject({ value: null, status: "needs_decision", explicitlyStated: true, updatedBy: "founder" });
    for (const [key, value] of Object.entries(expected) as Array<[keyof typeof expected, string]>) {
      const field = workspace.fields[key];
      expect(field).toMatchObject({ value, status: "confirmed", explicitlyStated: true, updatedBy: "founder" });
      expect(field.sourceSpans?.length).toBeGreaterThan(0);
      for (const span of field.sourceSpans ?? []) expect(MANUAL_INTAKE_PERSONA.slice(span.start, span.end)).toBe(span.text);
    }
    expect(JSON.stringify(workspace.fields)).not.toMatch(/Northstar Nibbles|fava-bean|2027-03-15/);
    expect(getSourcingReadiness(workspace).missingRequirements).not.toEqual(expect.arrayContaining([
      "product_format",
      "packaging_format",
      "packaging_size",
      "formulation_assistance",
      "storage_distribution",
      "allergens",
    ]));
    expect(getSourcingReadiness(workspace).missingRequirements).toContain("formula_status");
  });

  it("uses the latest explicit correction and keeps negated requirements out of live facts", () => {
    const idea = "Messy draft: 2 oz plastic bag. Correction: use a 1.25 oz recyclable pouch. It is not frozen; keep it shelf-stable. No dairy is allowed and peanut-free is required. Organic is not required. Launch was 2027-05-01, correction: 2027-06-15.";
    const workspace = createWorkspace({ idea });

    expect(workspace.fields.packaging_size.value).toBe("1.25 oz");
    expect(workspace.fields.packaging_format.value).toBe("Recyclable Pouch");
    expect(workspace.fields.storage_distribution.value).toBe("Shelf-stable");
    expect(workspace.fields.allergens.value).toBe("Dairy-free and peanut-free required");
    expect(workspace.fields.certifications.value).toBe("Not required: Organic");
    expect(workspace.fields.target_launch_date.value).toBe("2027-06-15");
    expect(JSON.stringify(workspace.fields)).not.toMatch(/2 oz plastic|Frozen|2027-05-01/);
  });

  it("turns a natural follow-up into every explicit fact without repeating resolved questions", () => {
    let workspace = createWorkspace({ idea: MANUAL_INTAKE_PERSONA });
    workspace = applyFounderConversationAnswer(workspace, {
      answeringKey: "product_format",
      text: "One 1.5 oz single-serve compostable pillow bag per customer—actually, use a recyclable snack bag if compostable film is not production-ready.",
    });
    workspace = applyFounderConversationAnswer(workspace, {
      answeringKey: "formula_status",
      text: "It’s a draft kitchen recipe, not tested or scale-ready, and yes, I need formulation assistance.",
    });

    expect(workspace.fields.product_format).toMatchObject({ value: "1.5 oz single-serve snack bag", status: "confirmed", updatedBy: "founder" });
    expect(workspace.fields.packaging_format).toMatchObject({ value: "Recyclable Snack Bag", status: "confirmed", updatedBy: "founder" });
    expect(workspace.fields.packaging_size.value).toBe("1.5 oz");
    expect(workspace.fields.formula_status.value).toBe("Draft kitchen recipe; not tested or scale-ready");
    expect(workspace.fields.formulation_assistance.value).toBe("Required");
    expect(getSourcingReadiness(workspace).missingRequirements).not.toEqual(expect.arrayContaining(["product_format", "packaging_format", "packaging_size", "formula_status", "formulation_assistance"]));
    expect(Object.values(workspace.fields).map((field) => field.value).join(" ")).not.toMatch(/compostable pillow bag/i);
  });

  it("accepts a later conversational quantity correction and keeps partial answers usable", () => {
    let workspace = createWorkspace({ idea: "Shelf-stable chickpea snack in a 1 oz pouch. First run 8,000 bags." });
    workspace = applyFounderConversationAnswer(workspace, { answeringKey: "production_volume", text: "Actually, correction: make that 6,000 bags." });
    workspace = applyFounderConversationAnswer(workspace, { answeringKey: "preferred_geography", text: "Northeast" });

    expect(workspace.fields.production_volume.value).toBe("6,000 bags");
    expect(workspace.fields.preferred_geography.value).toBe("Northeast");
    expect(workspace.fields.production_volume.sourceSpans?.[0].text).toContain("6,000 bags");
  });

  it("normalizes positive, preferred, and negated certifications without manufacturing gaps", () => {
    expect(normalizeCertificationRequirements("Organic is not required")).toEqual({ required: [], preferred: [], negated: ["Organic"] });
    expect(normalizeCertificationRequirements("Gluten-free required; organic not required")).toEqual({ required: ["Gluten-free"], preferred: [], negated: ["Organic"] });
    expect(normalizeCertificationRequirements("SQF is a must; gluten-free would be nice but organic is not required")).toEqual({ required: ["SQF"], preferred: ["Gluten-free"], negated: ["Organic"] });
    expect(normalizeCertificationRequirements("Organic preferred")).toEqual({ required: [], preferred: ["Organic"], negated: [] });
  });

  it("parses Creative Foodworks size and MOQ conflicts and ranks the actual records honestly", () => {
    const workspace = hotSauceWorkspace();
    const plants = ["creative-foodworks", "heritage-family-specialty-foods", "consolidated-mills-inc"].map((slug) => getPlantBySlug(slug)!);
    expect(plants.every(Boolean)).toBe(true);

    const preferred = matchManufacturerRecords(workspace, plants, {
      resultLimit: 3,
      requiredRequirements: ["product_type"],
      preferredRequirements: ["packaging_format", "packaging_size", "production_volume", "preferred_geography", "storage_distribution"],
    });
    const creative = preferred.find((match) => match.manufacturerSlug === "creative-foodworks")!;
    expect(preferred[0].manufacturerSlug).toBe("heritage-family-specialty-foods");
    expect(preferred.indexOf(creative)).toBeGreaterThan(0);
    expect(creative.possibleConflicts).toHaveLength(2);
    expect(creative.possibleConflicts).toEqual(expect.arrayContaining([
      expect.stringContaining("outside the published 8–32 oz"),
      expect.stringContaining("below the published 1,000-gallon minimum"),
    ]));

    for (const requiredKey of ["packaging_size", "production_volume"] as const) {
      const strict = matchManufacturerRecords(workspace, plants, {
        resultLimit: 3,
        requiredRequirements: ["product_type", requiredKey],
        preferredRequirements: ["packaging_format", "preferred_geography", "storage_distribution"],
      });
      expect(strict.map((match) => match.manufacturerSlug)).not.toContain("creative-foodworks");
    }
  });

  it("keeps exact product and woozy claims within field-specific evidence granularity", () => {
    const workspace = hotSauceWorkspace();
    const plants = ["heritage-family-specialty-foods", "consolidated-mills-inc"].map((slug) => getPlantBySlug(slug)!);
    const matches = matchManufacturerRecords(workspace, plants, {
      resultLimit: 3,
      preferredRequirements: ["product_type", "packaging_format", "packaging_size"],
    });
    const heritage = matches.find((match) => match.manufacturerSlug === "heritage-family-specialty-foods")!;
    const consolidated = matches.find((match) => match.manufacturerSlug === "consolidated-mills-inc")!;

    expect(heritage.supportedMatches).toEqual(expect.arrayContaining([
      "Reviewed product information explicitly names hot sauce.",
      expect.stringContaining("5–32 oz glass range"),
    ]));
    expect(heritage.unknowns).toContain("Exact glass woozy-bottle construction is not publicly established; evidence must name both glass and woozy.");
    expect(consolidated.supportedMatches).toEqual(expect.arrayContaining([
      "Reviewed product information supports the broader sauce family.",
      "Published packaging includes the broader bottle family.",
    ]));
    expect(consolidated.unknowns).toEqual(expect.arrayContaining([
      "Exact hot sauce capability is not publicly established by a field-specific source.",
      "Exact glass woozy-bottle construction is not publicly established; evidence must name both glass and woozy.",
    ]));
    expect(consolidated.supportedMatches.join(" ")).not.toMatch(/includes hot sauce|includes glass woozy/i);
  });

  it("persists the exact founder-approved research broadening audit record", () => {
    const workspace = hotSauceWorkspace();
    const originalRequest = { geographyPreference: null, resultLimit: 3, requiredRequirements: ["product_type"] as const, preferredRequirements: ["packaging_size"] as const };
    const broadenedRequest = { geographyPreference: null, resultLimit: 3, requiredRequirements: [] as const, preferredRequirements: ["packaging_size", "product_type"] as const };
    const approval: ManufacturerResearchBroadeningApproval = {
      originalRequest: { ...originalRequest, requiredRequirements: [...originalRequest.requiredRequirements], preferredRequirements: [...originalRequest.preferredRequirements] },
      broadenedRequest: { ...broadenedRequest, requiredRequirements: [], preferredRequirements: [...broadenedRequest.preferredRequirements] },
      approvedBy: "founder",
      approvedAt: "2026-09-02T12:00:00.000Z",
      workspaceRevision: workspace.revision,
      mutationId: "founder-broadening-mutation-001",
    };
    const updated = applyManufacturerResearch(workspace, approval.broadenedRequest, [], approval);

    expect(updated.manufacturerResearch?.broadeningApproval).toEqual(approval);
    expect(updated.activity[0]).toMatchObject({ kind: "research_broadened", details: approval });
  });

  it("renders date-only values as stable calendar dates and full timestamps by requested zone", () => {
    for (const timeZone of ["America/Chicago", "UTC", "Asia/Tokyo"]) {
      expect(formatReviewedDate("2026-08-25", timeZone)).toBe("Aug 25, 2026");
    }
    expect(formatReviewedDate("2026-08-25T01:00:00.000Z", "America/Chicago")).toBe("Aug 24, 2026");
    expect(formatReviewedDate("2026-08-25T01:00:00.000Z", "Asia/Tokyo")).toBe("Aug 25, 2026");
  });
});

function hotSauceWorkspace(): SourcingWorkspace {
  let workspace = createWorkspace({ idea: HOT_SAUCE_IDEA });
  workspace = applyFounderFieldUpdate(workspace, { key: "product_type", value: "Hot sauce", status: "confirmed", shareWithManufacturer: true });
  return workspace;
}
