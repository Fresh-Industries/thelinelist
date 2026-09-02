import { getPlantBySlug } from "@/lib/directory";
import { normalizeCertificationRequirements } from "@/lib/sourcing/certification-requirements";
import { formatReviewedDate } from "@/lib/sourcing/date-format";
import { matchManufacturerRecords } from "@/lib/sourcing/matching";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import { applyFounderFieldUpdate, applyManufacturerResearch, createWorkspace } from "@/lib/sourcing/workspace";
import type { ManufacturerResearchBroadeningApproval, SourcingWorkspace } from "@/lib/sourcing/types";
import { describe, expect, it } from "vitest";

const HOT_SAUCE_IDEA = "I want to make a tomato-free smoky carrot hot sauce in a 5 oz glass woozy bottle. I have a finished kitchen recipe, but it needs process-authority review and shelf-life review. I want about 10,000 bottles, prefer Texas or nearby, it should be shelf-stable, and organic certification is not required.";

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

  it("normalizes positive, preferred, and negated certifications without manufacturing gaps", () => {
    expect(normalizeCertificationRequirements("Organic is not required")).toEqual({ required: [], preferred: [], negated: ["Organic"] });
    expect(normalizeCertificationRequirements("Gluten-free required; organic not required")).toEqual({ required: ["Gluten-free"], preferred: [], negated: ["Organic"] });
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
