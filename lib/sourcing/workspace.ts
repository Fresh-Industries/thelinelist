import { randomBytes, randomUUID } from "node:crypto";
import { FIELD_DEFINITION_BY_KEY, SOURCING_FIELD_DEFINITIONS } from "./fields";
import { deriveProductDescriptorFromIdea, isOpenBrandAnswer } from "./product-identity";
import type { AgentFieldUpdate, OutreachDraft, PackageDesign, SourcingField, SourcingFieldKey, SourcingFieldStatus, SourcingWorkspace, WorkspaceActivity } from "./types";

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

function startingIdeaBootstrapUpdates(idea: string): AgentFieldUpdate[] {
  if (!/\bbanana\s+bread\b/i.test(idea)) return [];

  const existingHomeRecipe = /\b(?:make|makes|made|bake|bakes|baked|making|baking)\b[^.!?]{0,100}\b(?:at|from)\s+home\b/i.test(idea)
    || /\bhome(?:made|[-\s]baked)?\s+recipe\b/i.test(idea);
  const retailStores = /\b(?:sell|selling|sold)\b[^.!?]{0,100}\b(?:stores?|retail|grocery(?:\s+stores?)?)\b/i.test(idea);
  const confirmed: AgentFieldUpdate[] = [];

  if (existingHomeRecipe) {
    confirmed.push({
      key: "formula_status",
      value: "Existing home recipe",
      status: "confirmed",
      explicitlyStated: true,
      source: "Founder starting idea",
      reason: "The founder explicitly said the banana bread is currently made at home; commercial-scale readiness is not implied.",
      suggestedSharing: true,
    });
  }
  if (retailStores) {
    confirmed.push({
      key: "retail_channel",
      value: "Retail stores",
      status: "confirmed",
      explicitlyStated: true,
      source: "Founder starting idea",
      reason: "The founder explicitly said they want to sell the product in stores.",
      suggestedSharing: true,
    });
  }

  const description = existingHomeRecipe && retailStores
    ? "Packaged banana bread based on an existing home recipe and intended for retail stores; product format, storage, and first-run volume remain open."
    : "Packaged banana bread intended for commercial manufacturing; product format, storage, and first-run volume remain open.";

  return [...confirmed,
    {
      key: "product_category",
      value: "Packaged bakery / quick bread",
      status: "proposed",
      explicitlyStated: false,
      source: "Line List starter analysis",
      reason: "Banana bread is commonly sourced through packaged bakery and quick-bread manufacturers; this remains a proposed category until the founder reviews it.",
      suggestedSharing: true,
    },
    {
      key: "product_description",
      value: description,
      status: "proposed",
      explicitlyStated: false,
      source: "Line List starter analysis",
      reason: "This first-pass description uses only the founder's confirmed starting facts and keeps the material open decisions visible.",
      suggestedSharing: true,
    },
    {
      key: "packaging_format",
      value: "Windowed bakery bag or flow wrap",
      status: "proposed",
      explicitlyStated: false,
      source: "Line List starter analysis",
      reason: "This is a reversible retail packaging direction, not a production specification. Final material, barrier, seal, window, shelf-life, dimensions, and line compatibility require manufacturer validation.",
      suggestedSharing: true,
    },
  ];
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
    lastAgentChange: workspace.lastAgentChange ?? null,
    fields,
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs ?? [],
    matches: workspace.matches ?? [],
    outreachDrafts,
    inquiries: workspace.inquiries ?? [],
    activity: workspace.activity ?? [],
  };
}

export function createWorkspace(options: { demo?: boolean; id?: string; idea?: string; initialUpdates?: AgentFieldUpdate[] } = {}): SourcingWorkspace {
  const timestamp = now();
  const fields = Object.fromEntries(
    SOURCING_FIELD_DEFINITIONS.map(({ key }) => [key, blankField(key, timestamp)]),
  ) as Record<SourcingFieldKey, SourcingField>;

  const workspace: SourcingWorkspace = {
    id: options.id ?? randomBytes(18).toString("base64url"),
    ownership: { userId: null, brandId: null },
    originalIdea: options.idea?.trim() || null,
    artwork: null,
    packageDesign: null,
    lastAgentChange: null,
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
    const initialized = descriptor
      ? touch({
          ...workspace,
          fields: {
            ...workspace.fields,
            product_type: {
              ...workspace.fields.product_type,
              value: descriptor,
              status: "confirmed",
              source: "Founder starting idea",
              explicitlyStated: true,
              shareWithManufacturer: true,
              updatedAt: timestamp,
              updatedBy: "founder",
            },
          },
          activity: [activity("founder_updated", "Your starting idea was added to the plan."), ...workspace.activity],
        }, timestamp)
      : workspace;
    const bootstrapUpdates = startingIdeaBootstrapUpdates(idea);
    const bootstrapped = bootstrapUpdates.length ? applyAgentUpdates(initialized, bootstrapUpdates) : initialized;
    return options.initialUpdates?.length ? applyAgentUpdates(bootstrapped, options.initialUpdates) : bootstrapped;
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
  let fields = { ...workspace.fields };
  const changedKeySet = new Set(updates.map((update) => update.key));
  const previousFields: Partial<Record<SourcingFieldKey, SourcingField>> = Object.fromEntries(
    [...changedKeySet].map((key) => [key, workspace.fields[key]]),
  );
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
  if (!changedKeySet.has("product_description")) {
    const refreshedFields = refreshStarterProductDescription(fields, timestamp);
    if (refreshedFields !== fields) {
      changedKeySet.add("product_description");
      previousFields.product_description = workspace.fields.product_description;
      fields = refreshedFields;
    }
  }
  const changedKeys = [...changedKeySet];
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
    lastAgentChange: { id: randomUUID(), at: timestamp, changedKeys, previousFields },
    activity: addActivity(workspace.activity, activity("agent_proposed", activityDetail)),
  }, timestamp);
}

export function undoLastAgentChange(workspace: SourcingWorkspace, changeId: string): SourcingWorkspace {
  const snapshot = workspace.lastAgentChange;
  if (!snapshot || snapshot.id !== changeId) return workspace;
  const fields = { ...workspace.fields };
  for (const key of snapshot.changedKeys) {
    const previous = snapshot.previousFields[key];
    if (previous) fields[key] = previous;
  }
  return touch({
    ...workspace,
    fields,
    packageDesign: snapshot.packageDesignChanged ? snapshot.previousPackageDesign ?? null : workspace.packageDesign,
    lastAgentChange: null,
    activity: addActivity(workspace.activity, activity("agent_undone", `Undid the agent's latest ${snapshot.changedKeys.length} field change${snapshot.changedKeys.length === 1 ? "" : "s"}.`)),
  });
}

export function applyPackageDesignUpdate(workspace: SourcingWorkspace, design: PackageDesign, updatedBy: "founder" | "agent"): SourcingWorkspace {
  const timestamp = now();
  const packagingField: SourcingField = {
    ...workspace.fields.packaging_format,
    value: design.summary,
    status: "confirmed",
    reason: null,
    source: updatedBy === "agent" ? "Agent packaging update from founder instruction" : "Package mockup workbench",
    explicitlyStated: true,
    shareWithManufacturer: true,
    updatedAt: timestamp,
    updatedBy,
  };
  return touch({
    ...workspace,
    packageDesign: design,
    fields: { ...workspace.fields, packaging_format: packagingField },
    lastAgentChange: updatedBy === "agent" ? {
      id: randomUUID(),
      at: timestamp,
      changedKeys: ["packaging_format"],
      previousFields: { packaging_format: workspace.fields.packaging_format },
      packageDesignChanged: true,
      previousPackageDesign: workspace.packageDesign,
    } : workspace.lastAgentChange,
    activity: addActivity(workspace.activity, activity(updatedBy === "agent" ? "agent_proposed" : "founder_updated", updatedBy === "agent" ? "Your agent updated the packaging direction from your instruction." : "Packaging direction updated by founder.")),
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
  const fields = refreshStarterProductDescription({ ...workspace.fields, [input.key]: field }, timestamp);
  return touch({
    ...workspace,
    fields,
    activity: addActivity(workspace.activity, activity("founder_updated", `${definition.label} updated by founder.`)),
  }, timestamp);
}

function refreshStarterProductDescription(
  fields: Record<SourcingFieldKey, SourcingField>,
  timestamp: string,
): Record<SourcingFieldKey, SourcingField> {
  const current = fields.product_description;
  if (current.source !== "Line List starter analysis" || current.status !== "proposed") return fields;

  const confirmedValue = (key: SourcingFieldKey) => fields[key].status === "confirmed" ? fields[key].value : null;
  const product = confirmedValue("product_type") || "Packaged banana bread";
  const brand = confirmedValue("brand_name");
  const identity = brand ? `${brand} ${lowerFirst(product)}` : product;
  const details = [
    confirmedValue("product_format") ? `sold as ${lowerFirst(confirmedValue("product_format")!)}` : null,
    confirmedValue("formula_status") ? `based on ${lowerFirst(confirmedValue("formula_status")!)}` : null,
    confirmedValue("retail_channel") ? `intended for ${lowerFirst(confirmedValue("retail_channel")!)}` : null,
    confirmedValue("storage_distribution") ? `planned for ${lowerFirst(confirmedValue("storage_distribution")!)}` : null,
    confirmedValue("production_volume") ? `with an initial volume of ${lowerFirst(confirmedValue("production_volume")!)}` : null,
  ].filter((value): value is string => Boolean(value));
  const open = [
    ["product_format", "product format"],
    ["storage_distribution", "storage"],
    ["production_volume", "first-run volume"],
  ].filter(([key]) => fields[key as SourcingFieldKey].status !== "confirmed").map(([, label]) => label);
  const openSentence = open.length
    ? ` ${formatList(open)} ${open.length === 1 ? "remains" : "remain"} open.`
    : " Commercial scaling, shelf life, and final line compatibility still require manufacturer validation.";
  const value = `${identity}${details.length ? `, ${details.join(", ")}` : ""}.${openSentence}`;
  if (value === current.value) return fields;
  return {
    ...fields,
    product_description: {
      ...current,
      value,
      reason: "This first-pass description stays synchronized with confirmed founder decisions while preserving unresolved manufacturer validation.",
      updatedAt: timestamp,
      updatedBy: "agent",
    },
  };
}

function lowerFirst(value: string): string {
  return value.length ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
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

export function invalidateDraftsForProductChange(workspace: SourcingWorkspace): SourcingWorkspace {
  const timestamp = now();
  return {
    ...workspace,
    outreachDrafts: workspace.outreachDrafts.map((draft) => draft.sentAt ? draft : {
      ...draft,
      approvedVersion: null,
      approvedAt: null,
      deliveryStatus: "draft" as const,
      deliveryError: null,
      packet: { ...draft.packet, revokedAt: timestamp },
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
