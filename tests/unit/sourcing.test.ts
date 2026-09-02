import { FIELD_DEFINITION_BY_KEY, NEVER_SHARE_FIELD_KEYS } from "@/lib/sourcing/fields";
import { buildOutreachReadinessAudit } from "@/lib/sourcing/agent-state";
import { getPlantBySlug } from "@/lib/directory";
import { getGeographyMatchPreflight, interpretGeographyPreference } from "@/lib/sourcing/geography";
import { matchManufacturers } from "@/lib/sourcing/matching";
import { editAndApproveDraft, prepareOutreachDrafts } from "@/lib/sourcing/outreach";
import { getPackagingOptions, getProductCategory, resolveProductVisualAsset } from "@/lib/sourcing/product-catalog";
import { resolveProductCategoryFromText } from "@/lib/sourcing/product-category";
import { deriveProductDescriptorFromIdea, getProductIdentity } from "@/lib/sourcing/product-identity";
import { getProductJourney } from "@/lib/sourcing/product-journey";
import { getCategoryDecisionGuardrails, getSourcingCategory, getSourcingQuestion } from "@/lib/sourcing/questions";
import { PackageDesignSchema, ProductPlanSchema, productPlanFromWorkspace } from "@/lib/sourcing/product-plan";
import { getPackageColorName, getPackageDesignPresentation, getPackageValidationGuidance } from "@/lib/sourcing/package-presentation";
import { getPackageArtworkConcept, PACKAGE_ARTWORK_ASPECT } from "@/lib/sourcing/package-artwork";
import { getRecommendedWorkbenchPackageTypes } from "@/lib/sourcing/package-recommendations";
import { getSourcingReadiness, requiredMatchingFields } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, editDraftSchema, founderUpdateSchema, matchRequestSchema } from "@/lib/sourcing/schemas";
import { SOURCING_FIELD_KEYS } from "@/lib/sourcing/types";
import { applyAgentUpdates, applyFounderFieldUpdate, applyPackageDesignUpdate, createWorkspace, invalidateDraftApprovalsForFounderEmailChange, invalidateDraftsForProductChange, undoLastAgentChange } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

describe("sourcing workspace trust rules", () => {
  it("stores a landing-page idea as an explicit founder statement", () => {
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    expect(workspace.fields.product_type).toMatchObject({ status: "confirmed", updatedBy: "founder", explicitlyStated: true });
    expect(workspace.originalIdea).toBe("A packaged banana bread for grocery stores");
    expect(workspace.fields.product_type.value).toBe("Packaged banana bread");
    expect(workspace.fields.product_description).toMatchObject({ status: "proposed", updatedBy: "agent" });
    expect(getSourcingReadiness(workspace).nextQuestionKey).toBe("product_format");
    expect(workspace.matches).toEqual([]);
  });

  it("bootstraps a useful banana-bread brief without inventing a brand or closing material decisions", () => {
    const originalIdea = "Mya makes banana bread at home and we want to manufacture it and sell it in stores.";
    const workspace = createWorkspace({ idea: originalIdea });

    expect(workspace.originalIdea).toBe(originalIdea);
    expect(workspace.fields.product_type).toMatchObject({
      value: "Packaged banana bread",
      status: "confirmed",
      explicitlyStated: true,
      updatedBy: "founder",
    });
    expect(workspace.fields.brand_name).toMatchObject({ value: null, status: "unknown", explicitlyStated: false });
    expect(workspace.fields.formula_status).toMatchObject({
      value: "Existing home recipe",
      status: "confirmed",
      explicitlyStated: true,
      source: "Founder starting idea",
    });
    expect(workspace.fields.retail_channel).toMatchObject({
      value: "Retail stores",
      status: "confirmed",
      explicitlyStated: true,
      source: "Founder starting idea",
    });
    expect(workspace.fields.product_category).toMatchObject({
      value: "Packaged bakery / quick bread",
      status: "proposed",
      explicitlyStated: false,
      updatedBy: "agent",
    });
    expect(workspace.fields.product_description).toMatchObject({
      value: expect.stringContaining("product format, storage, and first-run volume remain open"),
      status: "proposed",
      explicitlyStated: false,
    });
    expect(workspace.fields.packaging_format).toMatchObject({
      value: "Windowed bakery bag or flow wrap",
      status: "proposed",
      explicitlyStated: false,
      reason: expect.stringContaining("require manufacturer validation"),
    });
    for (const key of ["product_format", "storage_distribution", "production_volume"] as const) {
      expect(workspace.fields[key]).toMatchObject({ value: null, status: "unknown" });
    }
    expect(getSourcingReadiness(workspace).nextQuestionKey).toBe("product_format");
  });

  it("asks missing material bakery decisions before reviewing starter proposals", () => {
    let workspace = createWorkspace({ idea: "Mya makes banana bread at home and we want to manufacture it and sell it in stores." });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_format", value: "Mini loaf", status: "confirmed", shareWithManufacturer: true });
    expect(getSourcingReadiness(workspace).nextQuestionKey).toBe("storage_distribution");
    expect(workspace.fields.product_description.value).toContain("sold as mini loaf");
    expect(workspace.fields.product_description.value).not.toContain("product format, storage, and first-run volume remain open");

    workspace = applyFounderFieldUpdate(workspace, { key: "storage_distribution", value: "Shelf-stable goal", status: "confirmed", shareWithManufacturer: true });
    expect(getSourcingReadiness(workspace).nextQuestionKey).toBe("production_volume");
    expect(workspace.fields.product_description.value).toContain("planned for shelf-stable goal");

    workspace = applyFounderFieldUpdate(workspace, { key: "production_volume", value: "1,000 to 2,000 units", status: "confirmed", shareWithManufacturer: true });
    expect(getSourcingReadiness(workspace).nextQuestionKey).toBe("packaging_size");
    expect(workspace.fields.product_description.value).toContain("with an initial volume of 1,000 to 2,000 units");
    expect(workspace.fields.product_description.value).not.toContain("remain open");
  });

  it("keeps brand, product, and original idea distinct while allowing the brand to stay open", () => {
    const initial = createWorkspace({ idea: "I want to make a packaged sauce that is really spicy and sell it in grocery stores." });
    expect(initial.originalIdea).toBe("I want to make a packaged sauce that is really spicy and sell it in grocery stores.");
    expect(getProductIdentity(initial)).toEqual({ brandName: null, productDescriptor: "Packaged sauce" });

    const openBrand = applyFounderFieldUpdate(initial, { key: "brand_name", value: "Not yet", status: "confirmed", shareWithManufacturer: true });
    expect(openBrand.fields.brand_name).toMatchObject({ value: null, status: "needs_decision", shareWithManufacturer: false });
    expect(getSourcingReadiness(openBrand).nextQuestionKey).toBe("product_format");

    const branded = applyFounderFieldUpdate(openBrand, { key: "brand_name", value: "Fireline Foods", status: "confirmed", shareWithManufacturer: true });
    expect(getProductIdentity(branded)).toEqual({ brandName: "Fireline Foods", productDescriptor: "Packaged sauce" });
    expect(branded.originalIdea).toBe(initial.originalIdea);
  });

  it("derives restrained product descriptors instead of promoting raw prompts", () => {
    expect(deriveProductDescriptorFromIdea("I make banana bread and want to sell it in stores.")).toBe("Packaged banana bread");
    expect(deriveProductDescriptorFromIdea("Mya makes banana bread at home and we want to manufacture it and sell it in stores.")).toBe("Packaged banana bread");
    expect(deriveProductDescriptorFromIdea("I want to make a packaged sauce that is really spicy and sell it in grocery stores.")).toBe("Packaged sauce");
    expect(deriveProductDescriptorFromIdea("A healthier sparkling energy drink in 12 oz cans")).toBe("Healthier sparkling energy drink");
  });

  it("asks category-aware questions and keeps beverage claims visibly unvalidated", () => {
    const beverage = createWorkspace({ idea: "A healthy organic sparkling energy drink for hydration" });
    expect(getSourcingQuestion(beverage, "product_format")).toContain("12 oz slim can");
    expect(getSourcingQuestion(beverage, "product_format")).not.toContain("mini loaf");
    expect(getCategoryDecisionGuardrails(beverage)).toEqual(expect.arrayContaining([
      expect.stringContaining("healthy"),
      expect.stringContaining("organic"),
      expect.stringContaining("Shelf-stable"),
    ]));
    expect(requiredMatchingFields(beverage)).toEqual(expect.arrayContaining(["carbonation", "packaging_size", "certifications"]));

    const bakery = createWorkspace({ idea: "A packaged banana bread" });
    expect(getSourcingQuestion(bakery, "product_format")).toContain("mini loaf");
  });

  it("creates category-aware package copy and motifs from the approved art direction", () => {
    const artwork = getPackageArtworkConcept({
      product: "High-protein crunchy chickpea snack",
      artDirection: "Warm honey and chili-red accents with chickpea, honey, and chili motifs",
      style: "playful-retail",
    });

    expect(artwork).toMatchObject({
      category: "snack",
      kicker: "CRUNCH WITH CHARACTER",
      footer: "BIG FLAVOR • READY TO SHARE",
      motifs: ["chickpea", "honey", "chili"],
    });
    expect(`${artwork.kicker} ${artwork.footer}`).not.toMatch(/bakery|baked/i);
    expect(PACKAGE_ARTWORK_ASPECT).toBeLessThan(1);

    expect(getPackageArtworkConcept({
      product: "Carbonated citrus drink",
      artDirection: "Citrus wheel with sparkling bubbles and angular lightning arcs",
      style: "modern-premium",
      category: "beverage",
    }).motifs).toEqual(["citrus", "bubbles", "lightning"]);
  });

  it("uses package-specific construction guidance without leaking bakery copy into cans", () => {
    expect(getPackageValidationGuidance("slim-can")).toMatch(/aluminum specification.*lining.*filling-line/i);
    expect(getPackageValidationGuidance("slim-can")).not.toMatch(/kraft|window|paper/i);
    expect(getPackageValidationGuidance("bakery-bag")).toMatch(/paper or film.*viewing-window.*packing-line/i);
    expect(getPackageValidationGuidance("stand-up-pouch")).toMatch(/film structure.*barrier.*pouch-filling/i);
  });

  it("keeps an explicitly confirmed snack out of the beverage path when it is sold in coffee shops", () => {
    let workspace = createWorkspace({ idea: "A high-protein crunchy chickpea snack sold at gyms and coffee shops" });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_category", value: "Snack", status: "confirmed", shareWithManufacturer: true });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_type", value: "High-protein crunchy chickpea snack sold at gyms and coffee shops", status: "confirmed", shareWithManufacturer: true });

    expect(getSourcingCategory(workspace)).toBe("food");
    expect(getProductCategory(workspace)).toBe("snack");
    expect(getPackagingOptions(workspace).map((option) => option.id)).toEqual([
      "flow-wrap-bar",
      "snack-bag",
      "stand-up-pouch",
    ]);
    expect(getSourcingQuestion(workspace, "product_format")).toBe("How should one customer buy and use the product?");
    expect(getSourcingQuestion(workspace, "carbonation")).not.toContain("drink");
    expect(getCategoryDecisionGuardrails(workspace)).toEqual([]);
    expect(requiredMatchingFields(workspace)).not.toContain("carbonation");
  });

  it("normalizes every canonical confirmed category label before choosing package options", () => {
    const cases = [
      { label: "Baked good", productType: "Banana bread", category: "bakery", firstPackage: "flow-wrap" },
      { label: "Bakery", productType: "Cookies", category: "bakery", firstPackage: "flow-wrap" },
      { label: "Packaged bakery / quick bread", productType: "Mini loaf", category: "bakery", firstPackage: "flow-wrap" },
      { label: "Beverage", productType: "Sparkling energy drink", category: "beverage", firstPackage: "standard-can" },
      { label: "Sauce / condiment", productType: "Hot sauce", category: "sauce", firstPackage: "glass-sauce-bottle" },
      { label: "Snack", productType: "Crunchy chickpea snack", category: "snack", firstPackage: "flow-wrap-bar" },
      { label: "Frozen food", productType: "Frozen grain bowl", category: "frozen", firstPackage: "frozen-bag" },
      { label: "Food", productType: "Prepared meal", category: "food", firstPackage: "pouch" },
    ] as const;

    for (const testCase of cases) {
      let workspace = createWorkspace({ idea: testCase.productType });
      workspace = applyFounderFieldUpdate(workspace, { key: "product_category", value: testCase.label, status: "confirmed", shareWithManufacturer: true });
      workspace = applyFounderFieldUpdate(workspace, { key: "product_type", value: testCase.productType, status: "confirmed", shareWithManufacturer: true });

      expect(getProductCategory(workspace), testCase.label).toBe(testCase.category);
      expect(getPackagingOptions(workspace)[0]?.id, testCase.label).toBe(testCase.firstPackage);
    }
  });

  it("falls back to confirmed product identity when a category label is unfamiliar", () => {
    let workspace = createWorkspace({ idea: "Banana bread for grocery stores" });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_category", value: "Emerging CPG concept", status: "confirmed", shareWithManufacturer: true });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_type", value: "Banana bread", status: "confirmed", shareWithManufacturer: true });

    expect(getProductCategory(workspace)).toBe("bakery");
    expect(getPackagingOptions(workspace)[0]?.id).toBe("flow-wrap");
  });

  it("uses one category engine for questions, packaging, artwork, and matching language", () => {
    let workspace = createWorkspace({ idea: "A honey chili crunchy chickpea snack" });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_category", value: "Snack", status: "confirmed", shareWithManufacturer: true });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_type", value: "Honey chili crunchy chickpea snack", status: "confirmed", shareWithManufacturer: true });

    expect(resolveProductCategoryFromText("Honey chili crunchy chickpea snack")).toBe("snack");
    expect(getProductCategory(workspace)).toBe("snack");
    expect(getSourcingCategory(workspace)).toBe("food");
    expect(getPackagingOptions(workspace)[0]?.id).toBe("flow-wrap-bar");
    expect(getPackageArtworkConcept({
      product: workspace.fields.product_type.value!,
      artDirection: "warm handmade with ingredient illustrations",
      style: "warm-handmade",
      category: getProductCategory(workspace),
    })).toMatchObject({ category: "snack", motifs: ["chickpea", "honey", "chili"] });
  });

  it("audits outreach gates without mutating founder state", () => {
    const workspace = createWorkspace({ idea: "A packaged banana bread mini loaf" });
    const before = JSON.stringify(workspace);
    const audit = buildOutreachReadinessAudit(workspace);

    expect(audit).toMatchObject({
      readyToPrepareDrafts: false,
      matchingCurrent: false,
      manufacturerBriefReady: false,
      packageDirectionSaved: false,
      selectionCount: 0,
      externalContactRequiresFounderAction: true,
      agentApprovalAvailable: false,
      agentSendAvailable: false,
      nothingWasSent: true,
    });
    expect(audit.gates.map((gate) => `${gate.owner}:${gate.step}`)).toEqual([
      "agent:research_manufacturers",
      "founder:select_manufacturers",
      "agent:prepare_recipient_specific_drafts",
      "founder:review_and_approve_exact_versions",
      "founder:confirm_send_now",
    ]);
    expect(JSON.stringify(workspace)).toBe(before);

    const zeroResultAudit = buildOutreachReadinessAudit({
      ...workspace,
      matchesUpdatedAt: "2026-09-01T12:00:00.000Z",
    });
    expect(zeroResultAudit).toMatchObject({
      matchingCurrent: true,
      candidateCount: 0,
      selectionCount: 0,
    });
    expect(zeroResultAudit.gates).toContainEqual({ step: "select_manufacturers", owner: "founder", status: "blocked" });
    expect(zeroResultAudit.blockers).toContainEqual(expect.stringContaining("no evidence-backed manufacturer possibilities"));
  });

  it("migrates a version-one plan without losing its original idea", () => {
    const workspace = createWorkspace({ idea: "I want to make a packaged sauce..." });
    const current = productPlanFromWorkspace(workspace);
    const legacyFields = Object.fromEntries(Object.entries(current.fields).filter(([key]) => key !== "brand_name"));
    const originalIdea = workspace.originalIdea!;
    legacyFields.product_type = { ...legacyFields.product_type, value: originalIdea };
    legacyFields.product_description = { ...legacyFields.product_description, value: originalIdea, status: "confirmed", source: "Founder starting idea", explicitlyStated: true, shareWithManufacturer: true, updatedBy: "founder" };

    const migrated = ProductPlanSchema.parse({ ...current, schemaVersion: 1, originalIdea: undefined, fields: legacyFields });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.originalIdea).toBe(originalIdea);
    expect(migrated.fields.brand_name).toMatchObject({ value: null, status: "unknown" });
  });

  it("keeps agent inferences proposed and explicit founder statements confirmed", () => {
    const workspace = applyAgentUpdates(createWorkspace(), [
      { key: "product_type", value: "Energy drink", explicitlyStated: true, source: "Founder statement" },
      { key: "carbonation", value: "Carbonated", explicitlyStated: false, reason: "Common, but not certain" },
      { key: "production_volume", value: null, explicitlyStated: false, reason: "Needed for matching" },
    ]);

    expect(workspace.fields.product_type.status).toBe("confirmed");
    expect(workspace.fields.carbonation.status).toBe("proposed");
    expect(workspace.fields.production_volume.status).toBe("needs_decision");
    expect(workspace.fields.budget.shareWithManufacturer).toBe(false);
  });

  it("makes the latest agent update visible and reversibly restores prior fields", () => {
    const initial = createWorkspace({ idea: "A sparkling energy drink" });
    const updated = applyAgentUpdates(initial, [
      { key: "packaging_size", value: "12 oz", explicitlyStated: true, status: "confirmed" },
      { key: "carbonation", value: "Carbonated", explicitlyStated: false, status: "proposed" },
    ]);
    expect(updated.lastAgentChange?.changedKeys).toEqual(["packaging_size", "carbonation"]);
    expect(updated.fields.packaging_size.value).toBe("12 oz");

    const restored = undoLastAgentChange(updated, updated.lastAgentChange!.id);
    expect(restored.fields.packaging_size.value).toBeNull();
    expect(restored.fields.carbonation.value).toBeNull();
    expect(restored.fields.product_description.value).toBe(initial.fields.product_description.value);
    expect(restored.lastAgentChange).toBeNull();
    expect(restored.activity[0].kind).toBe("agent_undone");
  });

  it("separates research readiness from manufacturer and launch readiness", () => {
    const concept = createWorkspace({ idea: "A packaged banana bread" });
    expect(getSourcingReadiness(concept)).toMatchObject({ searchReady: false, manufacturerReady: false, launchReady: false, stageLabel: "Shaping the idea" });
    const searchable = applyFounderFieldUpdate(concept, { key: "product_format", value: "Wrapped slice", status: "confirmed", shareWithManufacturer: true });
    expect(getSourcingReadiness(searchable)).toMatchObject({ searchReady: true, manufacturerReady: false, launchReady: false, stageLabel: "Ready to research" });
  });

  it("requires a founder-saved 3D package direction for manufacturer readiness", () => {
    let workspace = createWorkspace({ idea: "A sparkling beverage" });
    workspace = applyFounderFieldUpdate(workspace, { key: "brand_name", value: null, status: "needs_decision", shareWithManufacturer: false });
    for (const update of [
      { key: "product_format", value: "Single-serve drink" },
      { key: "product_description", value: "A shelf-stable sparkling beverage for grocery retail." },
      { key: "packaging_format", value: "12 oz slim can" },
      { key: "packaging_size", value: "12 oz" },
      { key: "storage_distribution", value: "Shelf stable" },
      { key: "production_volume", value: "1,000 to 5,000 units" },
      { key: "formula_status", value: "Tested recipe" },
      { key: "carbonation", value: "Carbonated" },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }

    expect(getSourcingReadiness(workspace)).toMatchObject({
      manufacturerReady: false,
      packageDesignRequired: true,
      packageDesignReady: false,
      nextQuestionKey: "packaging_format",
    });

    workspace = applyPackageDesignUpdate(workspace, PackageDesignSchema.parse({
      packagingType: "slim-can",
      finish: "colored",
      baseColor: "#b64d2c",
      labelColor: "#f2e8d5",
      artworkId: null,
      logoAspect: 1,
      logoScale: 1,
      logoPosition: { x: 0, y: 0 },
      dimensions: { width: null, height: null, depth: null },
      summary: "Slim can · dimensions still open",
    }), "founder");

    expect(getSourcingReadiness(workspace)).toMatchObject({
      manufacturerReady: true,
      packageDesignRequired: true,
      packageDesignReady: true,
    });
  });

  it("lets the founder confirm, reject, mark unknown, and control sharing", () => {
    const proposed = applyAgentUpdates(createWorkspace(), [
      { key: "carbonation", value: "Carbonated", explicitlyStated: false, suggestedSharing: true },
    ]);
    const confirmed = applyFounderFieldUpdate(proposed, { key: "carbonation", value: "Carbonated", status: "confirmed", shareWithManufacturer: true });
    expect(confirmed.fields.carbonation).toMatchObject({ status: "confirmed", shareWithManufacturer: true, updatedBy: "founder" });

    const unknown = applyFounderFieldUpdate(confirmed, { key: "carbonation", value: null, status: "unknown", shareWithManufacturer: false });
    expect(unknown.fields.carbonation).toMatchObject({ value: null, status: "unknown", shareWithManufacturer: false });
  });

  it("matches energy-drink requirements from structured catalog fields and keeps missing facts unknown", () => {
    const workspace = applyFounderFieldUpdate(createWorkspace({ demo: true }), {
      key: "carbonation",
      value: "Carbonated",
      status: "confirmed",
      shareWithManufacturer: true,
    });
    const matches = matchManufacturers(workspace, {
      resultLimit: 5,
      requiredRequirements: ["product_type", "packaging_format", "formulation_assistance"],
      preferredRequirements: ["preferred_geography"],
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.requirementsUsed.includes("product_type"))).toBe(true);
    expect(matches.some((match) => match.evidence.some((evidence) => evidence.status === "not_publicly_listed"))).toBe(true);
    expect(matches.flatMap((match) => match.evidence).every((evidence) => evidence.sourceUrl)).toBe(true);
    expect(matches.length).toBeLessThanOrEqual(3);
    expect(matches.some((match) => match.manufacturerName.startsWith("Better Beverage Company"))).toBe(true);
  });

  it("recognizes state names without mistaking ordinary two-letter words for state codes", () => {
    const workspace = applyFounderFieldUpdate(createWorkspace({ demo: true }), {
      key: "preferred_geography",
      value: "in my region im in texas",
      status: "confirmed",
      shareWithManufacturer: true,
    });
    const evidence = matchManufacturers(workspace, { geographyPreference: "in my region im in texas" })
      .flatMap((match) => match.evidence)
      .filter((item) => item.requirementKey === "preferred_geography");
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((item) => !item.claim.includes("MY") && !item.claim.includes("IM"))).toBe(true);
  });

  it("requires explicit state-code syntax and clarifies unsupported geography before matching", () => {
    expect(interpretGeographyPreference("near me")).toEqual({
      understood: false,
      label: "near me",
      stateCodes: [],
    });
    expect(interpretGeographyPreference("near ME")).toEqual({
      understood: true,
      label: "Maine",
      stateCodes: ["ME"],
    });

    const preflight = getGeographyMatchPreflight("Upper Lakes corridor");
    expect(preflight).toMatchObject({
      matchingAttempted: false,
      resultsShown: false,
      matchingGuidance: {
        geographyInputNeedsClarification: true,
      },
    });
    expect(preflight).not.toHaveProperty("workspace");
    expect(preflight).not.toHaveProperty("manufacturerCandidates");
    expect(getGeographyMatchPreflight("Midwest preferred")).toBeNull();
  });

  it("evaluates Midwest as a real set of states and ranks an in-region facility first", () => {
    let workspace = createWorkspace({ idea: "A packaged snack food" });
    for (const update of [
      { key: "product_category", value: "Snack" },
      { key: "product_type", value: "Snack foods" },
      { key: "storage_distribution", value: "Shelf-stable at room temperature" },
      { key: "preferred_geography", value: "Midwest preferred" },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }

    const matches = matchManufacturers(workspace, {
      geographyPreference: "Midwest preferred",
      preferredRequirements: ["preferred_geography"],
    });
    const assemblers = matches.find((match) => match.manufacturerSlug === "assemblers-inc");

    expect(matches[0]?.manufacturerSlug).toBe("assemblers-inc");
    expect(assemblers?.evidence.find((item) => item.requirementKey === "preferred_geography")).toMatchObject({
      status: expect.stringMatching(/publicly_listed|verified/),
      claim: expect.stringContaining("Midwest"),
    });
    expect(matches.every((match) => match.evidence.some((item) =>
      item.requirementKey === "preferred_geography" && item.claim.includes("within the Midwest preference"),
    ))).toBe(true);
    expect(assemblers?.fitExplanation).not.toMatch(/\?|manufacturer be|\?\./i);
    expect(assemblers?.fitExplanation).toContain("storage and distribution");
  });

  it("keeps unsupported geography visible instead of silently dropping it", () => {
    let workspace = createWorkspace({ idea: "A packaged snack food" });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_type", value: "Snack foods", status: "confirmed", shareWithManufacturer: true });
    workspace = applyFounderFieldUpdate(workspace, { key: "preferred_geography", value: "Within a two-hour drive", status: "confirmed", shareWithManufacturer: true });

    const matches = matchManufacturers(workspace, { geographyPreference: "Within a two-hour drive" });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.requirementsUsed.includes("preferred_geography"))).toBe(true);
    expect(matches.flatMap((match) => match.unknowns)).toEqual(expect.arrayContaining([
      expect.stringContaining("could not be interpreted as a state or supported region"),
    ]));
  });

  it("uses reviewed capability pages instead of homepages for judge-path evidence", () => {
    let workspace = createWorkspace({ idea: "A packaged snack food" });
    for (const update of [
      { key: "product_type", value: "Snack foods" },
      { key: "storage_distribution", value: "Shelf-stable at room temperature" },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }

    const matches = matchManufacturers(workspace);
    const assemblersProductEvidence = matches
      .find((match) => match.manufacturerSlug === "assemblers-inc")
      ?.evidence.find((item) => item.requirementKey === "product_type");
    const abcoProductEvidence = matches
      .find((match) => match.manufacturerSlug === "abco-laboratories-inc")
      ?.evidence.find((item) => item.requirementKey === "product_type");

    expect(assemblersProductEvidence).toMatchObject({
      sourceUrl: "https://www.assemblers.com/facility",
      sourceLabel: "Products and facilities",
      notes: null,
    });
    expect(abcoProductEvidence).toMatchObject({
      sourceUrl: "https://www.abcolabs.com/food-products/",
      sourceLabel: "Food products and packaging",
      notes: null,
    });
  });

  it("recommends only category-relevant 3D package families before progressive disclosure", () => {
    expect(getRecommendedWorkbenchPackageTypes("snack")).toEqual(["stand-up-pouch"]);
    expect(getRecommendedWorkbenchPackageTypes("beverage")).toEqual(["slim-can", "bottle"]);
    expect(getRecommendedWorkbenchPackageTypes("sauce")).toEqual(["bottle", "jar"]);
    expect(getRecommendedWorkbenchPackageTypes("bakery")).toEqual(["bakery-bag"]);
  });

  it("does not match an empty plan and allows sourced research with visible unknowns", () => {
    expect(matchManufacturers(createWorkspace(), { resultLimit: 10 })).toEqual([]);
    const earlyMatches = matchManufacturers(createWorkspace({ demo: true }), { resultLimit: 10 });
    expect(earlyMatches.length).toBeGreaterThan(0);
    expect(earlyMatches.some((match) => match.unknowns.length > 0 || match.possibleConflicts.length > 0)).toBe(true);
  });

  it("requires the core manufacturing decisions before matching", () => {
    let workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    workspace = applyFounderFieldUpdate(workspace, { key: "packaging_format", value: "Individually wrapped slices", status: "confirmed", shareWithManufacturer: true });
    expect(getSourcingReadiness(workspace)).toMatchObject({ matchingReady: false });
    expect(getSourcingReadiness(workspace).missingRequirements).toEqual(expect.arrayContaining(["packaging_size", "formula_status", "storage_distribution", "production_volume"]));
  });

  it("does not count straight or curly apostrophe uncertainty as a confirmed decision", () => {
    let workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    for (const update of [
      { key: "packaging_format", value: "I'm not sure yet" },
      { key: "packaging_size", value: "I’m not sure yet" },
      { key: "formula_status", value: "Not sure yet" },
      { key: "storage_distribution", value: "I'm not sure yet." },
      { key: "production_volume", value: "I’m not sure yet" },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }

    const readiness = getSourcingReadiness(workspace);
    expect(readiness.matchingReady).toBe(false);
    for (const key of ["packaging_format", "packaging_size", "formula_status", "storage_distribution", "production_volume"] as const) {
      expect(readiness.confirmedRequirements).not.toContain(key);
    }
  });

  it("does not infer beverage or snack requirements from substrings inside unrelated products", () => {
    expect(requiredMatchingFields(createWorkspace({ idea: "Packaged steak strips" }))).not.toContain("carbonation");
    expect(requiredMatchingFields(createWorkspace({ idea: "Barbecue sauce" }))).not.toContain("packaging_size");
  });

  it("returns only source-backed bakery possibilities while leaving package fit unknown", () => {
    let workspace = createWorkspace({ idea: "Packaged banana bread for grocery stores" });
    for (const update of [
      { key: "product_format", value: "Mini loaf" },
      { key: "packaging_format", value: "Individually wrapped slices" },
      { key: "packaging_size", value: "4 oz slice" },
      { key: "formula_status", value: "Recipe is ready" },
      { key: "storage_distribution", value: "Room temperature" },
      { key: "production_volume", value: "1,000 to 5,000 units" },
    ] as Array<{ key: "product_format" | "packaging_format" | "packaging_size" | "formula_status" | "storage_distribution" | "production_volume"; value: string }>) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }
    const matches = matchManufacturers(workspace, { resultLimit: 5 });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.evidence.some((evidence) => evidence.requirementKey === "product_type" && evidence.sourceUrl))).toBe(true);
    expect(matches.every((match) => getPlantBySlug(match.manufacturerSlug)?.categories?.includes("bakery"))).toBe(true);
    expect(matches.some((match) => match.unknowns.some((unknown) => /wrapped|4 oz/i.test(unknown)))).toBe(true);
    expect(matches.every((match) => match.unknowns.some((unknown) => /exact banana-bread capability/i.test(unknown)))).toBe(true);
    expect(matches.flatMap((match) => match.supportedMatches).some((claim) => /includes .*banana bread/i.test(claim))).toBe(false);
  });

  it("parses a saved bakery-bag summary without overstating a generic bag listing", () => {
    let workspace = createWorkspace({ idea: "A packaged banana bread" });
    for (const update of [
      { key: "product_format", value: "Mini loaf" },
      { key: "packaging_format", value: "Kraft-style bakery bag · dimensions still open · clear viewing window" },
      { key: "preferred_geography", value: "Iowa" },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }

    const matches = matchManufacturers(workspace, {
      resultLimit: 3,
      geographyPreference: "Iowa",
    });
    const packagingEvidence = matches
      .flatMap((match) => match.evidence)
      .find((item) => item.requirementKey === "packaging_format" && item.claim.startsWith("Bag packaging is published"));

    expect(matches.length).toBeGreaterThan(0);
    expect(packagingEvidence).toMatchObject({
      status: "not_publicly_listed",
      claim: "Bag packaging is published, but the exact windowed bakery-bag construction is not publicly established.",
      notes: expect.stringContaining("Confirm the window material"),
    });
  });

  it("does not surface broad snack manufacturers when the exact snack format is not publicly supported", () => {
    let workspace = createWorkspace({ idea: "A high-protein crunchy chickpea snack sold in coffee shops" });
    for (const update of [
      { key: "product_category", value: "Snack" },
      { key: "product_type", value: "High-protein crunchy chickpea snack" },
      { key: "product_format", value: "2.5 oz single-serve snack pouch" },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }

    const matches = matchManufacturers(workspace, { resultLimit: 3 });
    expect(matches).toEqual([]);
  });

  it("rejects matcher requirements the engine cannot evaluate and advertises only three results", () => {
    expect(matchRequestSchema.safeParse({ requiredRequirements: ["retail_channel"] }).success).toBe(false);
    expect(matchRequestSchema.safeParse({ preferredRequirements: ["product_category"] }).success).toBe(false);
    expect(matchRequestSchema.safeParse({ resultLimit: 4 }).success).toBe(false);
    expect(matchRequestSchema.parse({})).toMatchObject({ resultLimit: 3 });
  });

  it("accepts only public http source URLs and validates confirmed founder emails", () => {
    const baseUpdate = {
      revision: 1,
      proposedUpdates: [{
        key: "packaging_size",
        value: "4 oz",
        status: "proposed",
        sources: [{ title: "Source", claim: "Published size", url: "https://example.com/product" }],
      }],
    };
    expect(agentUpdateSchema.safeParse(baseUpdate).success).toBe(true);
    expect(agentUpdateSchema.safeParse({
      ...baseUpdate,
      proposedUpdates: [{ ...baseUpdate.proposedUpdates[0], sources: [{ title: "Source", claim: "Unsafe", url: "javascript:alert(1)" }] }],
    }).success).toBe(false);
    expect(() => agentUpdateSchema.safeParse({
      ...baseUpdate,
      proposedUpdates: [{ ...baseUpdate.proposedUpdates[0], sources: [{ title: "Source", claim: "Malformed", url: "not a url" }] }],
    })).not.toThrow();
    expect(agentUpdateSchema.safeParse({
      ...baseUpdate,
      proposedUpdates: [{ ...baseUpdate.proposedUpdates[0], sources: [{ title: "Source", claim: "Malformed", url: "not a url" }] }],
    }).success).toBe(false);
    expect(founderUpdateSchema.safeParse({
      revision: 1,
      fieldUpdate: { key: "contact_email", value: "not-an-email", status: "confirmed", shareWithManufacturer: false },
    }).success).toBe(false);
    expect(agentUpdateSchema.safeParse({
      revision: 1,
      proposedUpdates: [{ key: "contact_email", value: "not-an-email", explicitlyStated: true }],
    }).success).toBe(false);
  });

  it("allows every shareable field in a final approval", () => {
    const shareableKeys = SOURCING_FIELD_KEYS.filter((key) => !NEVER_SHARE_FIELD_KEYS.has(key));
    expect(shareableKeys).toHaveLength(28);
    expect(editDraftSchema.safeParse({ subject: "Introduction", body: "Approved body", includedFieldKeys: shareableKeys }).success).toBe(true);
  });

  it("maps a mini-loaf workspace to the reusable transparent bakery package library", () => {
    let workspace = createWorkspace({ idea: "Mya's packaged banana bread" });
    workspace = applyFounderFieldUpdate(workspace, { key: "product_format", value: "Mini loaf", status: "confirmed", shareWithManufacturer: true });
    workspace = applyFounderFieldUpdate(workspace, { key: "packaging_format", value: "Flow wrap", status: "confirmed", shareWithManufacturer: true });

    expect(getProductCategory(workspace)).toBe("bakery");
    expect(getPackagingOptions(workspace).map((option) => option.value)).toEqual(["Flow wrap", "Bakery bag", "Clamshell", "Tray and film"]);
    expect(resolveProductVisualAsset({ category: "bakery", packagingType: "Flow wrap" })).toMatchObject({ imageSrc: "/images/clay-v2/packaging/flow-wrap-mini-loaf.png" });
    expect(getProductJourney(workspace).map((step) => step.status)).toEqual(["complete", "complete", "current", "future", "future"]);
  });

  it("backfills canonical artwork placement metadata for older package directions", () => {
    const design = PackageDesignSchema.parse({
      packagingType: "jar",
      finish: "clear",
      baseColor: "#b64d2c",
      labelColor: "#f2e8d5",
      logoScale: 1,
      logoPosition: { x: 0, y: 0 },
      dimensions: { width: null, height: null, depth: null },
      summary: "clear jar · final dimensions open",
    });

    expect(design.artworkId).toBeNull();
    expect(design.previewAssetId).toBeNull();
    expect(design.logoAspect).toBeCloseTo(1345 / 662);
  });

  it("rejects bakery-bag values that the visible workbench cannot render faithfully", () => {
    const bakeryBag = {
      packagingType: "bakery-bag" as const,
      finish: "colored" as const,
      baseColor: "#b98a5f",
      labelColor: "#f2e8d5",
      frontText: { brand: "Mya's", product: "Banana Bread" },
      windowScale: 0.5,
      logoScale: 1,
      logoPosition: { x: 0.2, y: 0.2 },
      dimensions: { width: null, height: null, depth: null },
      summary: "Kraft-style bakery bag · dimensions still open · clear viewing window",
    };

    expect(PackageDesignSchema.safeParse(bakeryBag).success).toBe(true);
    expect(PackageDesignSchema.safeParse({ ...bakeryBag, finish: "clear" }).success).toBe(false);
    expect(PackageDesignSchema.safeParse({ ...bakeryBag, windowScale: 0 }).success).toBe(false);
    expect(PackageDesignSchema.safeParse({ ...bakeryBag, logoScale: 2 }).success).toBe(false);
    expect(PackageDesignSchema.safeParse({ ...bakeryBag, logoPosition: { x: 0.5, y: 0.2 } }).success).toBe(false);
    expect(PackageDesignSchema.safeParse({ ...bakeryBag, logoPosition: { x: 0.2, y: -0.5 } }).success).toBe(false);
  });

  it("presents canonical package state without exposing hex values or artwork filenames", () => {
    const design = PackageDesignSchema.parse({
      packagingType: "slim-can",
      finish: "colored",
      baseColor: "#CCAEF9",
      labelColor: "#f2e8d5",
      artworkId: "artwork-1",
      logoAspect: 1,
      logoScale: 1,
      logoPosition: { x: 0, y: 0 },
      dimensions: { width: null, height: null, depth: null },
      summary: "legacy implementation summary",
    });
    const artwork = { id: "artwork-1", fileName: "ChatGPT Image Aug 22.png", contentType: "image/png" as const, byteSize: 42, createdAt: new Date().toISOString() };

    expect(getPackageDesignPresentation(design, artwork)).toEqual({
      direction: "Slim can · dimensions still open",
      appearance: "Lavender · custom artwork added",
      validation: "Mockup for planning; final packaging requires manufacturer validation.",
    });
    expect(getPackageColorName("#B64D2C")).toBe("Terracotta");
    expect(getPackageColorName("#123456")).toBe("Custom color");
  });

  it("keeps researched suggestions proposed and preserves structured source evidence", () => {
    const workspace = applyAgentUpdates(createWorkspace({ idea: "Banana bread" }), [{
      key: "packaging_size",
      value: "4 oz wrapped slice",
      status: "proposed",
      source: "Comparable-product research",
      sources: [{ title: "Comparable bakery product", url: "https://example.com/product", claim: "The product is sold as a 4 oz slice.", publisher: "Example Bakery" }],
    }]);
    expect(workspace.fields.packaging_size.status).toBe("proposed");
    expect(workspace.fields.packaging_size.evidence).toEqual([expect.objectContaining({ url: "https://example.com/product", claim: "The product is sold as a 4 oz slice." })]);
  });

  it("excludes budget and unconfirmed proposals, then snapshots only the approved packet fields", () => {
    const matchingWorkspace = applyFounderFieldUpdate(createWorkspace({ demo: true }), {
      key: "carbonation",
      value: "Carbonated",
      status: "confirmed",
      shareWithManufacturer: true,
    });
    let workspace = createWorkspace({ demo: true });
    workspace = { ...workspace, matches: matchManufacturers(matchingWorkspace, { resultLimit: 2 }) };
    const manufacturerSlug = workspace.matches[0].manufacturerSlug;
    const [draft] = prepareOutreachDrafts(workspace, { selectedManufacturerIds: [manufacturerSlug] });

    expect(draft.includedFieldKeys).not.toContain("budget");
    expect(draft.includedFieldKeys).not.toContain("carbonation");
    expect(draft.excludedFieldKeys).toContain("internal_notes");
    const packetLifetime = new Date(draft.packet.expiresAt).getTime() - new Date(draft.packet.createdAt).getTime();
    expect(packetLifetime).toBe(30 * 24 * 60 * 60 * 1000);
    expect(draft.packet.revokedAt).toBeNull();

    const { draft: approved } = editAndApproveDraft(draft, workspace, {
      subject: draft.subject,
      body: draft.body,
      includedFieldKeys: [...draft.includedFieldKeys, "budget", "internal_notes"],
    });
    expect(approved.includedFieldKeys).toContain("budget");
    expect(approved.includedFieldKeys).not.toContain("internal_notes");
    expect(approved.packet.fieldValues.budget).toBe("About $15,000");
    expect(approved.approvedVersion).toBe(approved.version);
    expect(approved.humanSendTokenHash).toBeNull();
    expect(approved.humanSendTokenExpiresAt).toBeNull();

    const reapproved = editAndApproveDraft(approved, workspace, {
      subject: `${approved.subject} (updated)`,
      body: approved.body,
      includedFieldKeys: approved.includedFieldKeys,
    });
    expect(reapproved.draft.version).toBe(approved.version + 1);
    expect(reapproved.draft.approvedVersion).toBe(reapproved.draft.version);

    const renewed = editAndApproveDraft({
      ...approved,
      packet: { ...approved.packet, expiresAt: new Date(Date.now() - 1_000).toISOString(), revokedAt: new Date().toISOString() },
    }, workspace, {
      subject: approved.subject,
      body: approved.body,
      includedFieldKeys: approved.includedFieldKeys,
    });
    expect(Date.parse(renewed.draft.packet.expiresAt)).toBeGreaterThan(Date.now());
    expect(renewed.draft.packet.revokedAt).toBeNull();

    const invalidatedWorkspace = invalidateDraftApprovalsForFounderEmailChange({ ...workspace, outreachDrafts: [reapproved.draft] });
    expect(invalidatedWorkspace.outreachDrafts[0]).toMatchObject({
      approvedVersion: null,
      approvedAt: null,
      founderCopyEmail: null,
      humanSendTokenHash: null,
      humanSendTokenExpiresAt: null,
      deliveryStatus: "draft",
    });

    const productInvalidated = invalidateDraftsForProductChange({ ...workspace, outreachDrafts: [reapproved.draft] });
    expect(productInvalidated.outreachDrafts[0]).toMatchObject({
      approvedVersion: null,
      approvedAt: null,
      deliveryStatus: "draft",
    });
    expect(productInvalidated.outreachDrafts[0].packet.revokedAt).not.toBeNull();
  });

  it("keeps private founder drafting instructions out of recipient outreach", () => {
    let workspace = createWorkspace({ demo: true });
    workspace = { ...workspace, matches: matchManufacturers(workspace, { resultLimit: 1 }) };
    const manufacturerSlug = workspace.matches[0].manufacturerSlug;
    const [draft] = prepareOutreachDrafts(workspace, {
      selectedManufacturerIds: [manufacturerSlug],
      founderInstructions: "Make this sound exciting and do not mention our budget.",
    });

    expect(draft.body).not.toContain("Make this sound exciting");
    expect(draft.body).not.toContain("Additional context:");
    expect(draft.warnings).toContain("Private drafting instructions were not copied into the recipient message. Apply any desired wording during founder review.");
  });

  it("prepares separate drafts and uses only current sourced public manufacturer emails", () => {
    let workspace = createWorkspace({ demo: true });
    workspace = { ...workspace, matches: matchManufacturers(workspace, { resultLimit: 5 }) };
    const slugs = workspace.matches.slice(0, 3).map((match) => match.manufacturerSlug);
    const drafts = prepareOutreachDrafts(workspace, { selectedManufacturerIds: slugs });
    expect(drafts).toHaveLength(slugs.length);
    expect(new Set(drafts.map((draft) => draft.manufacturerSlug)).size).toBe(slugs.length);
    expect(drafts.every((draft) => draft.packet.fieldValues.brand_name === "Fresh Energy" && draft.body.includes("Fresh Energy"))).toBe(true);
    for (const draft of drafts) {
      const plant = getPlantBySlug(draft.manufacturerSlug)!;
      if (plant.publicEmail && !plant.needsCurrentOwnershipVerification) {
        expect(draft.availableDeliveryMethod).toBe("line_list_introduction");
        expect(draft.recipientEmail).toBe(plant.publicEmail);
      } else {
        expect(draft.availableDeliveryMethod).toBe("not_configured");
        expect(draft.recipientEmail).toBeNull();
      }
    }
  });

  it("keeps internal fields marked private by default", () => {
    expect(FIELD_DEFINITION_BY_KEY.internal_notes.privateByDefault).toBe(true);
    expect(FIELD_DEFINITION_BY_KEY.budget.shareByDefault).toBe(false);
  });
});
