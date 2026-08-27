import { FIELD_DEFINITION_BY_KEY, NEVER_SHARE_FIELD_KEYS } from "@/lib/sourcing/fields";
import { matchManufacturers } from "@/lib/sourcing/matching";
import { editAndApproveDraft, prepareOutreachDrafts, resolveApprovedDeliveryRecipient, validateHumanSendToken } from "@/lib/sourcing/outreach";
import { getSourcingReadiness, requiredMatchingFields } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, editDraftSchema, founderUpdateSchema } from "@/lib/sourcing/schemas";
import { SOURCING_FIELD_KEYS } from "@/lib/sourcing/types";
import { applyAgentUpdates, applyFounderFieldUpdate, createWorkspace, invalidateDraftApprovalsForFounderEmailChange } from "@/lib/sourcing/workspace";
import { describe, expect, it, vi } from "vitest";

describe("sourcing workspace trust rules", () => {
  it("stores a landing-page idea as an explicit founder statement", () => {
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    expect(workspace.fields.product_type).toMatchObject({ status: "confirmed", updatedBy: "founder", explicitlyStated: true });
    expect(workspace.fields.product_description.value).toBe("A packaged banana bread for grocery stores");
    expect(workspace.matches).toEqual([]);
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
      { key: "packaging_format", value: "Individually wrapped slices" },
      { key: "packaging_size", value: "4 oz slice" },
      { key: "formula_status", value: "Recipe is ready" },
      { key: "storage_distribution", value: "Room temperature" },
      { key: "production_volume", value: "1,000 to 5,000 units" },
    ] as Array<{ key: "packaging_format" | "packaging_size" | "formula_status" | "storage_distribution" | "production_volume"; value: string }>) {
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
    expect(shareableKeys).toHaveLength(24);
    expect(editDraftSchema.safeParse({ subject: "Introduction", body: "Approved body", includedFieldKeys: shareableKeys }).success).toBe(true);
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

    const { draft: approved, humanSendToken } = editAndApproveDraft(draft, workspace, {
      subject: draft.subject,
      body: draft.body,
      includedFieldKeys: [...draft.includedFieldKeys, "budget", "internal_notes"],
    });
    expect(approved.includedFieldKeys).toContain("budget");
    expect(approved.includedFieldKeys).not.toContain("internal_notes");
    expect(approved.packet.fieldValues.budget).toBe("About $15,000");
    expect(approved.approvedVersion).toBe(approved.version);
    expect(validateHumanSendToken(approved, humanSendToken)).toBe(true);
    expect(validateHumanSendToken(approved, "not-the-founder-token")).toBe(false);

    const expiredApproval = {
      ...approved,
      humanSendTokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    };
    expect(validateHumanSendToken(expiredApproval, humanSendToken)).toBe(false);

    const reapproved = editAndApproveDraft(approved, workspace, {
      subject: `${approved.subject} (updated)`,
      body: approved.body,
      includedFieldKeys: approved.includedFieldKeys,
    });
    expect(validateHumanSendToken(reapproved.draft, humanSendToken)).toBe(false);
    expect(validateHumanSendToken(reapproved.draft, reapproved.humanSendToken)).toBe(true);

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
    expect(validateHumanSendToken(invalidatedWorkspace.outreachDrafts[0], reapproved.humanSendToken)).toBe(false);
  });

  it("uses a sourced manufacturer email only in live mode and keeps the founder copied", () => {
    vi.stubEnv("SOURCING_DELIVERY_MODE", "live");
    vi.stubEnv("SOURCING_DEMO_RECIPIENT", "demo@example.com");
    try {
      let workspace = createWorkspace({ demo: true });
      workspace = applyFounderFieldUpdate(workspace, {
        key: "contact_email",
        value: "founder@example.com",
        status: "confirmed",
        shareWithManufacturer: false,
      });
      workspace = { ...workspace, matches: matchManufacturers(workspace, { resultLimit: 5 }) };

      const [draft] = prepareOutreachDrafts(workspace, { selectedManufacturerIds: ["better-beverage-company"] });

      expect(draft.availableDeliveryMethod).toBe("line_list_introduction");
      expect(draft.recipientEmail).toBe("Wade@BetterBeverageCompany.com");
      expect(draft.demoRecipient).toBeNull();
      expect(draft.founderCopyEmail).toBe("founder@example.com");
      expect(resolveApprovedDeliveryRecipient(draft)).toEqual({ ok: true, recipient: "Wade@BetterBeverageCompany.com" });

      vi.stubEnv("SOURCING_DELIVERY_MODE", "off");
      expect(resolveApprovedDeliveryRecipient(draft)).toMatchObject({ ok: false, status: 503 });

      vi.stubEnv("SOURCING_DELIVERY_MODE", "live");
      expect(resolveApprovedDeliveryRecipient({ ...draft, recipientEmail: "stale@example.com" })).toMatchObject({ ok: false, status: 409 });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps internal fields marked private by default", () => {
    expect(FIELD_DEFINITION_BY_KEY.internal_notes.privateByDefault).toBe(true);
    expect(FIELD_DEFINITION_BY_KEY.budget.shareByDefault).toBe(false);
  });
});
