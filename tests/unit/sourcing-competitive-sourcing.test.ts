import { getPlantBySlug } from "@/lib/directory";
import type { Plant } from "@/lib/directory/types";
import { buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import { matchManufacturerRecords } from "@/lib/sourcing/matching";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import type { SourcingFieldKey, SourcingWorkspace } from "@/lib/sourcing/types";
import { applyFounderFieldUpdate, createWorkspace } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

const JUNIPER_IDEA = "Juniper Kite is a fictional shelf-stable, non-alcoholic sparkling tart-cherry and basil drink in a single-serve 12 fl oz slim can. A bench formula exists but needs scale-up help. The first run is 25,000 cans, Midwest manufacturing is preferred but not required, organic certification is explicitly not required, printed-can sourcing help is preferred, and the target launch is 2027-04-15.";

const PREFERRED_REQUIREMENTS: SourcingFieldKey[] = [
  "product_type",
  "packaging_format",
  "packaging_size",
  "carbonation",
  "formulation_assistance",
  "preferred_geography",
  "production_volume",
  "storage_distribution",
];

describe("competitive sparkling-beverage sourcing regressions", () => {
  it("keeps exact requested-product claims unknown on category-only beverage evidence", () => {
    const workspace = juniperWorkspace();
    const plants = reviewedBeveragePlants();

    expect(matchManufacturerRecords(workspace, plants, {
      resultLimit: 3,
      requiredRequirements: ["product_type"],
      preferredRequirements: PREFERRED_REQUIREMENTS.filter((key) => key !== "product_type"),
    })).toEqual([]);

    const defaultDiscovery = matchManufacturerRecords(workspace, plants, { resultLimit: 3 });
    expect(defaultDiscovery).toHaveLength(3);
    expect(defaultDiscovery.every((match) => match.unknowns.some((claim) => claim.startsWith("Exact capability for Sparkling tart-cherry")))).toBe(true);

    const broadDiscovery = matchManufacturerRecords(workspace, plants, {
      resultLimit: 3,
      preferredRequirements: PREFERRED_REQUIREMENTS,
    });
    expect(broadDiscovery.map((match) => match.manufacturerSlug)).toEqual([
      "prospectors-specialty-beverage",
      "better-beverage-company",
      "swift-cider",
    ]);
    for (const match of broadDiscovery) {
      expect(match.supportedMatches).toContain("Reviewed product information supports the broader beverage category.");
      expect(match.supportedMatches.join(" ")).not.toContain("Sparkling tart-cherry and basil drink");
      expect(match.unknowns).toContain("Exact capability for Sparkling tart-cherry and basil drink is not publicly established by the reviewed product source.");
      expect(match.fitExplanation).not.toMatch(/supports the product type/i);
      expect(match.evidence
        .filter((item) => item.status === "verified" || item.status === "publicly_listed" || item.status === "conflicting")
        .every((item) => item.sourceUrl !== null)).toBe(true);
      expect(match.reasonTrace?.some((item) => item.requirementKey === "certifications")).toBe(false);
    }
    expect(broadDiscovery.find((match) => match.manufacturerSlug === "better-beverage-company")?.evidence.map((item) => item.sourceUrl))
      .not.toContain("https://betterbeveragecompany.com/about-us/");
  });

  it("normalizes slim and sleek cans plus fluid-ounce spellings without broadening generic cans", () => {
    const matches = matchManufacturerRecords(juniperWorkspace(), reviewedBeveragePlants(), {
      resultLimit: 3,
      preferredRequirements: PREFERRED_REQUIREMENTS,
    });
    const prospectors = matches.find((match) => match.manufacturerSlug === "prospectors-specialty-beverage")!;
    const better = matches.find((match) => match.manufacturerSlug === "better-beverage-company")!;

    expect(prospectors.supportedMatches).toEqual(expect.arrayContaining([
      "Reviewed packaging explicitly includes sleek cans, treated as equivalent to the requested slim-can construction.",
      "Reviewed packaging or minimum-order information explicitly includes 12 oz.",
    ]));
    expect(prospectors.unknowns.join(" ")).not.toMatch(/12 fl oz|slim-can construction/i);
    expect(prospectors.evidence.find((item) => item.requirementKey === "packaging_format")?.sourceUrl)
      .toBe("https://www.drinkprospectors.com/private-label");

    expect(better.supportedMatches).toContain("Reviewed packaging supports cans as a broader package family.");
    expect(better.unknowns).toContain("Exact slim-can construction is not publicly established by the reviewed packaging source.");
    expect(better.evidence.find((item) => item.requirementKey === "packaging_format" && /broader package family/i.test(item.claim))?.sourceUrl)
      .toBe("https://betterbeveragecompany.com/capabilities/");
  });

  it("uses explicit approximate case-pack arithmetic but never invents a missing pack count", () => {
    const workspace = juniperWorkspace();
    const swift = getPlantBySlug("swift-cider")!;
    const compared = matchManufacturerRecords(workspace, [swift], {
      resultLimit: 1,
      preferredRequirements: PREFERRED_REQUIREMENTS,
    })[0];

    expect(compared.supportedMatches).toContain("25,000 cans meets the published approximate minimum of 9,600 cans (about 400 cases × 24 cans per case).");
    expect(compared.evidence.find((item) => item.requirementKey === "production_volume")?.sourceUrl)
      .toBe("https://www.swiftcider.com/copacking");

    const ambiguous: Plant = {
      ...swift,
      slug: "swift-ambiguous-case-pack",
      name: "Swift Ambiguous Case Pack",
      moqDisplay: "Approximately 400 cases of 12 oz cans; case pack not published.",
    };
    const ambiguousMatch = matchManufacturerRecords(workspace, [ambiguous], {
      resultLimit: 1,
      preferredRequirements: PREFERRED_REQUIREMENTS,
    })[0];
    expect(ambiguousMatch.supportedMatches.join(" ")).not.toMatch(/9,600|400 cases ×/);
    expect(ambiguousMatch.unknowns).toContain("A public minimum is listed, but its units cannot be responsibly compared with 25,000 cans.");
  });

  it("compares Create-A-Pack's package-scoped lowest unit band with requested bottles", () => {
    const workspace = bottledSauceWorkspace();
    const createAPack = getPlantBySlug("create-a-pack-foods-inc")!;
    const preferred = matchManufacturerRecords(workspace, [createAPack], {
      resultLimit: 1,
      preferredRequirements: PREFERRED_REQUIREMENTS,
    })[0];

    expect(preferred.possibleConflicts).toContain("9,000 bottles is 41,000 units below the published 50,000-unit minimum for glass bottles.");
    expect(preferred.unknowns).not.toContain("A public minimum is listed, but its units cannot be responsibly compared with 9,000 bottles.");
    expect(preferred.reasonTrace).toContainEqual(expect.objectContaining({ requirementKey: "production_volume", priority: "preferred", outcome: "conflict" }));

    const strict = matchManufacturerRecords(workspace, [createAPack], {
      resultLimit: 1,
      requiredRequirements: ["product_type", "production_volume"],
      preferredRequirements: PREFERRED_REQUIREMENTS.filter((key) => key !== "production_volume"),
    });
    expect(strict).toEqual([]);
  });

  it("does not compare generic unit bands without matching package-family scope", () => {
    const workspace = bottledSauceWorkspace();
    const base = getPlantBySlug("create-a-pack-foods-inc")!;
    const fixtures: Plant[] = [
      { ...base, slug: "unit-band-pouches-only", name: "Unit Band Pouches Only", moqDisplay: "Lowest band is 50000 units for pouches." },
      { ...base, slug: "unlabeled-facility-number", name: "Unlabeled Facility Number", moqDisplay: "Facility is 50000 sq ft; minimum is not published." },
    ];

    for (const match of matchManufacturerRecords(workspace, fixtures, { resultLimit: 2, preferredRequirements: PREFERRED_REQUIREMENTS })) {
      expect(match.possibleConflicts.join(" ")).not.toMatch(/50,000-unit|41,000/);
      expect(match.unknowns).toContain("A public minimum is listed, but its units cannot be responsibly compared with 9,000 bottles.");
    }
  });

  it("preserves organic negation and proposed category provenance", () => {
    const workspace = createWorkspace({
      idea: JUNIPER_IDEA,
      initialUpdates: [{
        key: "product_category",
        value: "Beverage",
        status: "proposed",
        explicitlyStated: false,
        source: "Agent category inference",
      }],
    });
    const agentState = buildSourcingAgentState(workspace);

    expect(workspace.fields.certifications).toMatchObject({
      value: "Not required: Organic",
      status: "confirmed",
      validationStatus: "not_required",
      shareWithManufacturer: false,
    });
    expect(getSourcingReadiness(workspace).missingRequirements).not.toContain("certifications");
    expect(agentState.decisionGuardrails.join(" ")).not.toMatch(/organic.*(?:requirement|guardrail)/i);
    expect(workspace.fields.product_category).toMatchObject({
      value: "Beverage",
      status: "proposed",
      explicitlyStated: false,
      source: "Agent category inference",
      confirmation: null,
    });
  });

  it("captures the customer-facing can format once and does not reopen Package before visual commitment", () => {
    const workspace = createWorkspace({ idea: JUNIPER_IDEA });
    const readiness = getSourcingReadiness(workspace);
    const agentState = buildSourcingAgentState(workspace);

    expect(workspace.fields.product_format).toMatchObject({ value: "12 oz slim can", status: "confirmed", explicitlyStated: true });
    expect(workspace.fields.packaging_format).toMatchObject({ value: "Slim Can", status: "confirmed", explicitlyStated: true });
    expect(workspace.fields.packaging_size).toMatchObject({ value: "12 oz", status: "confirmed", explicitlyStated: true });
    expect(readiness.missingRequirements).not.toEqual(expect.arrayContaining(["product_format", "packaging_format"]));
    expect(agentState.requirements.open.map((field) => field.key)).not.toEqual(expect.arrayContaining(["product_format", "packaging_format"]));
    expect(agentState.packaging.saved).toBe(false);
    expect(agentState.packaging.commitment).toBeNull();
  });

  it("keeps deterministic ranking and exposes a compact requirement trace", () => {
    const workspace = juniperWorkspace();
    const options = { resultLimit: 3, preferredRequirements: PREFERRED_REQUIREMENTS };
    const first = matchManufacturerRecords(workspace, reviewedBeveragePlants(), options);
    const second = matchManufacturerRecords(workspace, [...reviewedBeveragePlants()].reverse(), options);

    expect(second.map((match) => match.manufacturerSlug)).toEqual(first.map((match) => match.manufacturerSlug));
    for (const match of first) {
      expect(match.reasonTrace).toEqual(expect.arrayContaining([
        expect.objectContaining({ requirementKey: "product_type", priority: "preferred", outcome: "broad_support" }),
        expect.objectContaining({ requirementKey: "preferred_geography", priority: "preferred" }),
      ]));
      expect(match.fitExplanation).not.toMatch(/organic/i);
    }
  });
});

function reviewedBeveragePlants(): Plant[] {
  return ["prospectors-specialty-beverage", "better-beverage-company", "swift-cider"].map((slug) => getPlantBySlug(slug)!);
}

function juniperWorkspace(): SourcingWorkspace {
  let workspace = createWorkspace({ idea: JUNIPER_IDEA });
  const updates: Array<[SourcingFieldKey, string]> = [
    ["product_type", "Sparkling tart-cherry and basil drink"],
    ["product_format", "Single-serve 12 fl oz slim can"],
    ["packaging_format", "Slim can"],
    ["packaging_size", "12 fluid ounces"],
    ["carbonation", "Carbonated"],
    ["formulation_assistance", "Scale-up help needed"],
    ["production_volume", "25,000 cans"],
    ["preferred_geography", "Midwest"],
    ["storage_distribution", "Shelf-stable"],
    ["certifications", "Organic certification is not required"],
  ];
  for (const [key, value] of updates) {
    workspace = applyFounderFieldUpdate(workspace, { key, value, status: "confirmed", shareWithManufacturer: key !== "certifications" });
  }
  return workspace;
}

function bottledSauceWorkspace(): SourcingWorkspace {
  let workspace = createWorkspace({ idea: "Shelf-stable barbecue sauce in an 8 oz glass woozy bottle. First run 9,000 bottles." });
  const updates: Array<[SourcingFieldKey, string]> = [
    ["product_type", "Barbecue sauce"],
    ["product_format", "8 oz bottle"],
    ["packaging_format", "Glass woozy bottle"],
    ["packaging_size", "8 oz"],
    ["production_volume", "9,000 bottles"],
    ["formulation_assistance", "Required"],
    ["preferred_geography", "Midwest"],
    ["storage_distribution", "Shelf-stable"],
  ];
  for (const [key, value] of updates) {
    workspace = applyFounderFieldUpdate(workspace, { key, value, status: "confirmed", shareWithManufacturer: true });
  }
  return workspace;
}
