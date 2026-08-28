import { randomBytes, randomUUID } from "node:crypto";
import { FIELD_DEFINITION_BY_KEY, SOURCING_FIELD_DEFINITIONS } from "./fields";
import { deriveProductDescriptorFromIdea, isOpenBrandAnswer } from "./product-identity";
import type { AgentFieldUpdate, OutreachDraft, SourcingField, SourcingFieldKey, SourcingFieldStatus, SourcingWorkspace, WorkspaceActivity } from "./types";

function now(): string {
  return new Date().toISOString();
}

function activity(kind: WorkspaceActivity["kind"], message: string): WorkspaceActivity {
  return { id: randomUUID(), kind, message, at: now() };
}

function blankField(key: SourcingFieldKey, timestamp: string): SourcingField {
  return {
    key,
    value: null,
    status: "unknown",
    reason: null,
    source: null,
    explicitlyStated: false,
    shareWithManufacturer: false,
    updatedAt: timestamp,
    updatedBy: "system",
    evidence: [],
  };
}

export function normalizeWorkspace(workspace: SourcingWorkspace): SourcingWorkspace {
  const timestamp = workspace.updatedAt || now();
  const legacyIdea = [workspace.fields?.product_description, workspace.fields?.product_type]
    .find((field) => field?.source === "Founder starting idea" && field.value)?.value ?? null;
  const originalIdea = workspace.originalIdea?.trim() || legacyIdea;
  const fields = Object.fromEntries(
    SOURCING_FIELD_DEFINITIONS.map(({ key }) => {
      const existing = workspace.fields?.[key];
      return [key, existing ? { ...blankField(key, timestamp), ...existing, evidence: existing.evidence ?? [] } : blankField(key, timestamp)];
    }),
  ) as Record<SourcingFieldKey, SourcingField>;
  if (originalIdea) {
    const descriptor = deriveProductDescriptorFromIdea(originalIdea);
    if (fields.product_type.source === "Founder starting idea" && fields.product_type.value === originalIdea) {
      fields.product_type = descriptor ? { ...fields.product_type, value: descriptor } : blankField("product_type", timestamp);
    }
    if (fields.product_description.source === "Founder starting idea" && fields.product_description.value === originalIdea) {
      fields.product_description = blankField("product_description", timestamp);
    }
  }
  const outreachDrafts = (workspace.outreachDrafts ?? []).map((draft): OutreachDraft => ({
    ...draft,
    recipientEmail: draft.recipientEmail ?? draft.demoRecipient ?? null,
    founderCopyEmail: draft.founderCopyEmail ?? null,
    humanSendTokenHash: draft.humanSendTokenHash ?? null,
    humanSendTokenExpiresAt: draft.humanSendTokenExpiresAt ?? null,
  }));
  return {
    ...workspace,
    ownership: workspace.ownership ?? { userId: null, brandId: null },
    originalIdea,
    artwork: workspace.artwork ?? null,
    packageDesign: workspace.packageDesign ?? null,
    fields,
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs ?? [],
    matches: workspace.matches ?? [],
    outreachDrafts,
    inquiries: workspace.inquiries ?? [],
    activity: workspace.activity ?? [],
  };
}

export function createWorkspace(options: { demo?: boolean; idea?: string } = {}): SourcingWorkspace {
  const timestamp = now();
  const fields = Object.fromEntries(
    SOURCING_FIELD_DEFINITIONS.map(({ key }) => [key, blankField(key, timestamp)]),
  ) as Record<SourcingFieldKey, SourcingField>;

  const workspace: SourcingWorkspace = {
    id: randomBytes(18).toString("base64url"),
    ownership: { userId: null, brandId: null },
    originalIdea: options.idea?.trim() || null,
    artwork: null,
    packageDesign: null,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    fields,
    selectedManufacturerSlugs: [],
    matches: [],
    matchesUpdatedAt: null,
    outreachDrafts: [],
    inquiries: [],
    activity: [activity("created", options.demo ? "Energy-drink demo plan created." : "Product plan created.")],
  };

  const idea = options.idea?.trim();
  if (!options.demo) {
    if (!idea) return workspace;
    const descriptor = deriveProductDescriptorFromIdea(idea);
    if (!descriptor) return workspace;
    const founderProduct: SourcingField = {
      ...workspace.fields.product_type,
      value: descriptor,
      status: "confirmed",
      source: "Founder starting idea",
      explicitlyStated: true,
      shareWithManufacturer: true,
      updatedAt: timestamp,
      updatedBy: "founder",
    };
    return touch({
      ...workspace,
      fields: { ...workspace.fields, product_type: founderProduct },
      activity: [activity("founder_updated", "Your starting idea was added to the plan."), ...workspace.activity],
    }, timestamp);
  }

  return applyAgentUpdates(workspace, [
    { key: "brand_name", value: "Fresh Energy", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "product_category", value: "Beverage", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "product_format", value: "12 oz drink", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "product_type", value: "Healthier energy drink", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "packaging_format", value: "Cans", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "packaging_size", value: "12 oz", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "budget", value: "About $15,000", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: false },
    { key: "target_launch_date", value: "Within six months", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "preferred_geography", value: "Near Texas", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "formulation_assistance", value: "Required", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "storage_distribution", value: "Room temperature", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "production_volume", value: "1,000 to 5,000 units", explicitlyStated: true, source: "Founder demo statement", suggestedSharing: true },
    { key: "carbonation", value: "Carbonated", explicitlyStated: false, source: "Agent inference from energy drink", reason: "Many energy drinks are carbonated, but this needs founder confirmation.", suggestedSharing: true },
  ]);
}

export function applyAgentUpdates(workspace: SourcingWorkspace, updates: AgentFieldUpdate[]): SourcingWorkspace {
  const timestamp = now();
  const fields = { ...workspace.fields };
  for (const update of updates) {
    const definition = FIELD_DEFINITION_BY_KEY[update.key];
    const brandStillOpen = update.key === "brand_name" && isOpenBrandAnswer(update.value);
    const normalizedValue = brandStillOpen ? null : update.value;
    const hasValue = typeof normalizedValue === "string" && normalizedValue.trim().length > 0;
    const requestedStatus = brandStillOpen ? "needs_decision" : update.status ?? (update.explicitlyStated ? "confirmed" : "proposed");
    const status: SourcingFieldStatus = hasValue
      ? requestedStatus === "confirmed" && update.explicitlyStated !== true ? "proposed" : requestedStatus
      : "needs_decision";
    const evidence = (update.sources ?? []).map((source) => ({
      title: source.title.trim(),
      url: source.url,
      claim: source.claim.trim(),
      publisher: source.publisher?.trim() || null,
      reviewedAt: source.reviewedAt ?? timestamp,
    }));
    fields[update.key] = {
      ...fields[update.key],
      value: hasValue ? normalizedValue!.trim() : null,
      status,
      reason: update.reason?.trim() || null,
      source: update.source?.trim() || null,
      explicitlyStated: update.explicitlyStated === true,
      shareWithManufacturer: hasValue && !definition.privateByDefault
        ? (update.suggestedSharing ?? definition.shareByDefault)
        : false,
      updatedAt: timestamp,
      updatedBy: "agent",
      evidence,
    };
  }
  const meaningfulUpdates = updates.filter((update) => update.value?.trim() && !(update.key === "brand_name" && isOpenBrandAnswer(update.value)));
  const suggestedCount = meaningfulUpdates.filter((update) => !update.explicitlyStated).length;
  const detailCount = meaningfulUpdates.length;
  const suggestionNote = suggestedCount
    ? ` ${suggestedCount} suggestion${suggestedCount === 1 ? " needs" : "s need"} your review.`
    : "";
  const activityDetail = detailCount
    ? `Your agent added ${detailCount} detail${detailCount === 1 ? "" : "s"} from your conversation.${suggestionNote}`
    : "Your agent kept an open decision explicit so it will not block the product brief.";
  return touch({
    ...workspace,
    fields,
    activity: addActivity(workspace.activity, activity("agent_proposed", activityDetail)),
  }, timestamp);
}

export function applyFounderFieldUpdate(
  workspace: SourcingWorkspace,
  input: { key: SourcingFieldKey; value: string | null; status: SourcingFieldStatus; shareWithManufacturer?: boolean },
): SourcingWorkspace {
  const timestamp = now();
  const definition = FIELD_DEFINITION_BY_KEY[input.key];
  const brandStillOpen = input.key === "brand_name" && isOpenBrandAnswer(input.value);
  const value = brandStillOpen ? null : input.value?.trim() || null;
  const requestedStatus = brandStillOpen ? "needs_decision" : input.status;
  const status = value ? requestedStatus : requestedStatus === "rejected" || requestedStatus === "needs_decision" ? requestedStatus : "unknown";
  const field: SourcingField = {
    ...workspace.fields[input.key],
    value,
    status,
    reason: status === "confirmed" ? null : workspace.fields[input.key].reason,
    explicitlyStated: status === "confirmed",
    shareWithManufacturer: Boolean(value && status === "confirmed" && !definition.privateByDefault && input.shareWithManufacturer),
    updatedAt: timestamp,
    updatedBy: "founder",
    evidence: workspace.fields[input.key].evidence ?? [],
  };
  return touch({
    ...workspace,
    fields: { ...workspace.fields, [input.key]: field },
    activity: addActivity(workspace.activity, activity("founder_updated", `${definition.label} updated by founder.`)),
  }, timestamp);
}

export function invalidateDraftApprovalsForFounderEmailChange(workspace: SourcingWorkspace): SourcingWorkspace {
  const timestamp = now();
  return {
    ...workspace,
    outreachDrafts: workspace.outreachDrafts.map((draft) => draft.sentAt ? draft : {
      ...draft,
      approvedVersion: null,
      approvedAt: null,
      deliveryStatus: "draft" as const,
      deliveryError: null,
      founderCopyEmail: null,
      humanSendTokenHash: null,
      humanSendTokenExpiresAt: null,
      updatedAt: timestamp,
    }),
  };
}

export function touch(workspace: SourcingWorkspace, timestamp = now()): SourcingWorkspace {
  return { ...workspace, revision: workspace.revision + 1, updatedAt: timestamp };
}

export function addWorkspaceActivity(workspace: SourcingWorkspace, kind: WorkspaceActivity["kind"], message: string): SourcingWorkspace {
  return touch({ ...workspace, activity: addActivity(workspace.activity, activity(kind, message)) });
}

function addActivity(current: WorkspaceActivity[], next: WorkspaceActivity): WorkspaceActivity[] {
  return [next, ...current].slice(0, 20);
}
