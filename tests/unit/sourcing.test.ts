import { FIELD_DEFINITION_BY_KEY } from "@/lib/sourcing/fields";
import { matchManufacturers } from "@/lib/sourcing/matching";
import { editAndApproveDraft, prepareOutreachDrafts } from "@/lib/sourcing/outreach";
import { applyAgentUpdates, applyFounderFieldUpdate, createWorkspace } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

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

    const approved = editAndApproveDraft(draft, workspace, {
      subject: draft.subject,
      body: draft.body,
      includedFieldKeys: [...draft.includedFieldKeys, "budget", "internal_notes"],
    });
    expect(approved.includedFieldKeys).toContain("budget");
    expect(approved.includedFieldKeys).not.toContain("internal_notes");
    expect(approved.packet.fieldValues.budget).toBe("About $15,000");
    expect(approved.approvedVersion).toBe(approved.version);
  });

  it("keeps internal fields marked private by default", () => {
    expect(FIELD_DEFINITION_BY_KEY.internal_notes.privateByDefault).toBe(true);
    expect(FIELD_DEFINITION_BY_KEY.budget.shareByDefault).toBe(false);
  });
});
