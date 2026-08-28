import { FIELD_DEFINITION_BY_KEY, NEVER_SHARE_FIELD_KEYS } from "@/lib/sourcing/fields";
import { matchManufacturers } from "@/lib/sourcing/matching";
import { editAndApproveDraft, prepareOutreachDrafts } from "@/lib/sourcing/outreach";
import { getPackagingOptions, getProductCategory, resolveProductVisualAsset } from "@/lib/sourcing/product-catalog";
import { deriveProductDescriptorFromIdea, getProductIdentity } from "@/lib/sourcing/product-identity";
import { getProductJourney } from "@/lib/sourcing/product-journey";
import { PackageDesignSchema, ProductPlanSchema, productPlanFromWorkspace } from "@/lib/sourcing/product-plan";
import { getPackageColorName, getPackageDesignPresentation } from "@/lib/sourcing/package-presentation";
import { getSourcingReadiness, requiredMatchingFields } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, editDraftSchema, founderUpdateSchema } from "@/lib/sourcing/schemas";
import { SOURCING_FIELD_KEYS } from "@/lib/sourcing/types";
import { applyAgentUpdates, applyFounderFieldUpdate, createWorkspace, invalidateDraftApprovalsForFounderEmailChange } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

describe("sourcing workspace trust rules", () => {
  it("stores a landing-page idea as an explicit founder statement", () => {
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    expect(workspace.fields.product_type).toMatchObject({ status: "confirmed", updatedBy: "founder", explicitlyStated: true });
    expect(workspace.originalIdea).toBe("A packaged banana bread for grocery stores");
    expect(workspace.fields.product_type.value).toBe("Packaged banana bread");
    expect(workspace.fields.product_description.value).toBeNull();
    expect(getSourcingReadiness(workspace).nextQuestionKey).toBe("brand_name");
    expect(workspace.matches).toEqual([]);
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
    expect(deriveProductDescriptorFromIdea("I make banana bread and want to sell it in stores.")).toBe("Banana bread");
    expect(deriveProductDescriptorFromIdea("I want to make a packaged sauce that is really spicy and sell it in grocery stores.")).toBe("Packaged sauce");
    expect(deriveProductDescriptorFromIdea("A healthier sparkling energy drink in 12 oz cans")).toBe("Healthier sparkling energy drink");
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
    expect(matches.map((match) => match.manufacturerName)).toEqual(expect.arrayContaining(["Better Beverage Company", "Portland Bottling Company"]));
  });

  it("does not match an empty plan or pad an unresolved plan with weak results", () => {
    expect(matchManufacturers(createWorkspace(), { resultLimit: 10 })).toEqual([]);
    expect(matchManufacturers(createWorkspace({ demo: true }), { resultLimit: 10 })).toEqual([]);
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
    expect(matches.map((match) => match.manufacturerName)).toEqual(expect.arrayContaining(["Bake'n Joy Foods, Inc."]));
    expect(matches.some((match) => match.unknowns.some((unknown) => /wrapped|4 oz/i.test(unknown)))).toBe(true);
    expect(matches.every((match) => match.unknowns.some((unknown) => /exact banana-bread capability/i.test(unknown)))).toBe(true);
    expect(matches.flatMap((match) => match.supportedMatches).some((claim) => /includes .*banana bread/i.test(claim))).toBe(false);
  });

  it("treats absent or unevaluable hard requirements as gaps", () => {
    const workspace = applyFounderFieldUpdate(createWorkspace({ demo: true }), {
      key: "carbonation",
      value: "Carbonated",
      status: "confirmed",
      shareWithManufacturer: true,
    });
    expect(matchManufacturers(workspace, { requiredRequirements: ["retail_channel"] })).toEqual([]);
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
    expect(getProductJourney(workspace).map((step) => step.status)).toEqual(["complete", "complete", "complete", "current", "future"]);
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
    expect(design.logoAspect).toBeCloseTo(1345 / 662);
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
  });

  it("prepares separate drafts for multiple manufacturers without configuring a recipient or send path", () => {
    let workspace = createWorkspace({ demo: true });
    workspace = { ...workspace, matches: matchManufacturers(workspace, { resultLimit: 5 }) };
    const slugs = workspace.matches.slice(0, 3).map((match) => match.manufacturerSlug);
    const drafts = prepareOutreachDrafts(workspace, { selectedManufacturerIds: slugs });
    expect(drafts).toHaveLength(slugs.length);
    expect(new Set(drafts.map((draft) => draft.manufacturerSlug)).size).toBe(slugs.length);
    expect(drafts.every((draft) => draft.packet.fieldValues.brand_name === "Fresh Energy" && draft.body.includes("Fresh Energy"))).toBe(true);
    expect(drafts.every((draft) => draft.availableDeliveryMethod === "not_configured" && draft.recipientEmail === null)).toBe(true);
  });

  it("keeps internal fields marked private by default", () => {
    expect(FIELD_DEFINITION_BY_KEY.internal_notes.privateByDefault).toBe(true);
    expect(FIELD_DEFINITION_BY_KEY.budget.shareByDefault).toBe(false);
  });
});
