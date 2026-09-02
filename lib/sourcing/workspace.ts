import { createHash, randomBytes, randomUUID } from "node:crypto";
import { FIELD_DEFINITION_BY_KEY, SOURCING_FIELD_DEFINITIONS } from "./fields";
import { deriveProductDescriptorFromIdea, isOpenBrandAnswer } from "./product-identity";
import { extractExplicitFounderFacts } from "./intake-extractor";
import { normalizeCertificationRequirements } from "./certification-requirements";
import type { AgentFieldUpdate, ManufacturerMatch, ManufacturerResearchBroadeningApproval, ManufacturerResearchRequest, OutreachDraft, PackageDesign, SourcingField, SourcingFieldKey, SourcingFieldStatus, SourcingValidationStatus, SourcingWorkspace, WorkspaceActivity } from "./types";

function now(): string {
  return new Date().toISOString();
}

function activity(kind: WorkspaceActivity["kind"], message: string, details?: Record<string, unknown>): WorkspaceActivity {
  return { id: randomUUID(), kind, message, at: now(), details: details ?? null };
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
    confirmation: null,
    validationStatus: "not_required",
    evidence: [],
    sourceSpans: [],
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
  const normalized: SourcingWorkspace = {
    ...workspace,
    ownership: workspace.ownership ?? { userId: null, brandId: null },
    originalIdea,
    creationRequestHash: workspace.creationRequestHash ?? null,
    artwork: workspace.artwork ?? null,
    packageDesign: workspace.packageDesign ?? null,
    stagedPackageDesign: workspace.stagedPackageDesign ?? null,
    packageCommit: workspace.packageCommit ?? null,
    lastAgentChange: workspace.lastAgentChange ?? null,
    fields,
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs ?? [],
    matches: workspace.matches ?? [],
    matchesUpdatedAt: workspace.matchesUpdatedAt ?? null,
    manufacturerResearch: workspace.manufacturerResearch ?? null,
    outreachDrafts,
    inquiries: workspace.inquiries ?? [],
    activity: workspace.activity ?? [],
  };
  const research = normalized.manufacturerResearch;
  if (!research) return normalized;
  const current = research.status === "current"
    && research.candidateCount === research.candidates.length
    && research.planFingerprint === manufacturerPlanFingerprint(normalized);
  return {
    ...normalized,
    manufacturerResearch: current ? research : { ...research, status: "stale", invalidatedAt: research.invalidatedAt ?? timestamp },
    matches: current ? research.candidates : [],
    matchesUpdatedAt: current ? research.ranAt : null,
  };
}

export function createWorkspace(options: { demo?: boolean; id?: string; idea?: string; initialUpdates?: AgentFieldUpdate[]; creationRequestHash?: string } = {}): SourcingWorkspace {
  const timestamp = now();
  const fields = Object.fromEntries(
    SOURCING_FIELD_DEFINITIONS.map(({ key }) => [key, blankField(key, timestamp)]),
  ) as Record<SourcingFieldKey, SourcingField>;

  const workspace: SourcingWorkspace = {
    id: options.id ?? randomBytes(18).toString("base64url"),
    ownership: { userId: null, brandId: null },
    originalIdea: options.idea?.trim() || null,
    creationRequestHash: options.creationRequestHash ?? null,
    artwork: null,
    packageDesign: null,
    stagedPackageDesign: null,
    packageCommit: null,
    lastAgentChange: null,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    fields,
    selectedManufacturerSlugs: [],
    matches: [],
    matchesUpdatedAt: null,
    manufacturerResearch: null,
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
              confirmation: founderConfirmation("founder_statement", timestamp, workspace.revision),
              validationStatus: "not_required",
            },
          },
          activity: [activity("founder_updated", "Your starting idea was added to the plan."), ...workspace.activity],
        }, timestamp)
      : workspace;
    const proposedCategory = options.initialUpdates?.some((update) => update.key === "product_category"
      && (update.status === "proposed" || update.explicitlyStated === false));
    const explicitFacts = extractExplicitFounderFacts(idea)
      .filter((update) => !(proposedCategory && update.key === "product_category"));
    const extracted = explicitFacts.length ? applyFounderIdeaFacts(initialized, explicitFacts) : initialized;
    const bootstrapUpdates = startingIdeaBootstrapUpdates(idea);
    const bootstrapped = bootstrapUpdates.length ? applyAgentUpdates(extracted, bootstrapUpdates) : extracted;
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

function applyFounderIdeaFacts(workspace: SourcingWorkspace, updates: AgentFieldUpdate[]): SourcingWorkspace {
  return applyFounderFacts(workspace, updates, "founder_statement", "Explicit details from your starting idea were added to the plan.");
}

function applyFounderFacts(
  workspace: SourcingWorkspace,
  updates: AgentFieldUpdate[],
  channel: "founder_statement" | "workspace_ui",
  activityMessage: string,
): SourcingWorkspace {
  const timestamp = now();
  const fields = { ...workspace.fields };
  for (const update of updates) {
    const definition = FIELD_DEFINITION_BY_KEY[update.key];
    const value = update.value?.trim() || null;
    const status = value ? update.status ?? "confirmed" : "needs_decision";
    fields[update.key] = {
      ...fields[update.key],
      value,
      status,
      reason: update.reason?.trim() || null,
      source: update.source?.trim() || "Founder starting idea",
      explicitlyStated: update.explicitlyStated === true,
      shareWithManufacturer: Boolean(value && status === "confirmed" && !definition.privateByDefault && (update.suggestedSharing ?? definition.shareByDefault)),
      updatedAt: timestamp,
      updatedBy: "founder",
      confirmation: status === "confirmed" ? founderConfirmation(channel, timestamp, workspace.revision) : null,
      validationStatus: validationStatusFor(update.key, value, update.reason, fields[update.key].validationStatus),
      evidence: [],
      sourceSpans: update.sourceSpans ?? [],
    };
  }
  return touch({
    ...workspace,
    fields,
    activity: addActivity(workspace.activity, activity("founder_updated", activityMessage)),
  }, timestamp);
}

export function applyFounderConversationAnswer(
  workspace: SourcingWorkspace,
  input: { answeringKey: SourcingFieldKey; text: string },
): SourcingWorkspace {
  const text = input.text.trim();
  const brandStillOpen = input.answeringKey === "brand_name" && isOpenBrandAnswer(text);
  const uncertain = brandStillOpen || /^(?:(?:i(?:'|’)m)\s+)?(?:not\s+)?sure(?:\s+yet)?[.!]?$/i.test(text);
  const extracted = uncertain ? [] : extractExplicitFounderFacts(text, "Founder conversation answer");
  const updates = [...extracted];
  if (updates.length === 0) {
    updates.push({
      key: input.answeringKey,
      value: brandStillOpen ? null : text,
      status: uncertain ? "needs_decision" : "confirmed",
      explicitlyStated: true,
      source: "Founder conversation answer",
      sourceSpans: uncertain ? [] : [{ start: 0, end: text.length, text }],
      reason: uncertain ? "The founder explicitly kept this decision open." : "The founder answered this product decision in the workspace.",
      suggestedSharing: !uncertain,
    });
  }
  return applyFounderFacts(workspace, updates, "workspace_ui", updates.length === 1
    ? `${FIELD_DEFINITION_BY_KEY[input.answeringKey].label} updated by founder.`
    : `${updates.length} explicit details from the founder's answer were added to the plan.`);
}

export function applyAgentUpdates(workspace: SourcingWorkspace, updates: AgentFieldUpdate[]): SourcingWorkspace {
  const timestamp = now();
  let fields = { ...workspace.fields };
  const changedKeySet = new Set<SourcingFieldKey>();
  const previousFields: Partial<Record<SourcingFieldKey, SourcingField>> = {};
  for (const update of updates) {
    const definition = FIELD_DEFINITION_BY_KEY[update.key];
    const current = fields[update.key];
    const brandStillOpen = update.key === "brand_name" && isOpenBrandAnswer(update.value);
    const normalizedValue = brandStillOpen ? null : update.value;
    const hasValue = typeof normalizedValue === "string" && normalizedValue.trim().length > 0;
    const requestedStatus = brandStillOpen ? "needs_decision" : update.status ?? (update.explicitlyStated ? "confirmed" : "proposed");
    const founderStatement = requestedStatus === "confirmed" && update.explicitlyStated === true;
    if (current.status === "confirmed" && !founderStatement) continue;
    const founderOnlyPromotion = founderStatement && (current.status === "proposed" || current.status === "needs_decision");
    const status: SourcingFieldStatus = hasValue
      ? requestedStatus === "confirmed" && (update.explicitlyStated !== true || founderOnlyPromotion) ? "proposed" : requestedStatus
      : "needs_decision";
    const evidence = (update.sources ?? []).map((source) => ({
      title: source.title.trim(),
      url: source.url,
      claim: source.claim.trim(),
      publisher: source.publisher?.trim() || null,
      reviewedAt: source.reviewedAt ?? timestamp,
    }));
    previousFields[update.key] = current;
    changedKeySet.add(update.key);
    fields[update.key] = {
      ...current,
      value: hasValue ? normalizedValue!.trim() : null,
      status,
      reason: founderOnlyPromotion
        ? update.reason?.trim() || "This proposal still needs an explicit founder confirmation in the workspace."
        : update.reason?.trim() || null,
      source: update.source?.trim() || null,
      explicitlyStated: status === "confirmed" && update.explicitlyStated === true,
      shareWithManufacturer: hasValue && !definition.privateByDefault
        ? (update.suggestedSharing ?? definition.shareByDefault)
        : false,
      updatedAt: timestamp,
      updatedBy: "agent",
      confirmation: status === "confirmed" ? founderConfirmation("founder_statement", timestamp, workspace.revision) : null,
      validationStatus: validationStatusFor(update.key, hasValue ? normalizedValue!.trim() : null, update.reason, current.validationStatus),
      evidence,
      sourceSpans: update.sourceSpans ?? [],
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

export function stagePackageDesign(
  workspace: SourcingWorkspace,
  input: { stageId: string; packageDesign: PackageDesign; stagedBy: "agent" | "founder" },
): SourcingWorkspace {
  const timestamp = now();
  return touch({
    ...workspace,
    stagedPackageDesign: {
      id: input.stageId,
      design: input.packageDesign,
      stagedAt: timestamp,
      stagedBy: input.stagedBy,
      designHash: packageDesignHash(input.packageDesign),
    },
    activity: addActivity(workspace.activity, activity(input.stagedBy === "agent" ? "agent_proposed" : "founder_updated", "A package direction was staged for visible founder review.")),
  }, timestamp);
}

export function commitStagedPackageDesign(
  workspace: SourcingWorkspace,
  input: { commitId: string; stagedPackageId: string },
): SourcingWorkspace {
  const staged = workspace.stagedPackageDesign;
  if (!staged || staged.id !== input.stagedPackageId || staged.designHash !== packageDesignHash(staged.design)) {
    throw new Error("The staged package direction changed. Review the current preview before committing it.");
  }
  const timestamp = now();
  const design = staged.design;
  return touch({
    ...workspace,
    packageDesign: design,
    stagedPackageDesign: null,
    packageCommit: {
      id: input.commitId,
      actor: "founder",
      channel: "workspace_ui",
      committedAt: timestamp,
      sourceRevision: workspace.revision,
      designHash: staged.designHash,
      stagedPackageId: staged.id,
    },
    activity: addActivity(workspace.activity, activity("founder_updated", "Packaging direction committed by the founder from the visible workbench.")),
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
    confirmation: status === "confirmed" ? founderConfirmation("workspace_ui", timestamp, workspace.revision) : null,
    validationStatus: validationStatusFor(input.key, value, workspace.fields[input.key].reason, workspace.fields[input.key].validationStatus),
    evidence: workspace.fields[input.key].evidence ?? [],
    sourceSpans: workspace.fields[input.key].sourceSpans ?? [],
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

export function packageDesignHash(design: PackageDesign): string {
  return stableHash(design);
}

export function hasValidFounderPackageCommit(workspace: SourcingWorkspace): boolean {
  const commit = workspace.packageCommit;
  return Boolean(
    workspace.packageDesign
    && commit
    && commit.actor === "founder"
    && commit.channel === "workspace_ui"
    && commit.sourceRevision < workspace.revision
    && commit.designHash === packageDesignHash(workspace.packageDesign),
  );
}

export function manufacturerPlanFingerprint(workspace: SourcingWorkspace): string {
  const keys: SourcingFieldKey[] = [
    "product_name", "product_category", "product_format", "product_type", "product_description",
    "formula_status", "formulation_assistance", "carbonation", "manufacturing_process", "packaging_format",
    "packaging_size", "production_volume", "certifications", "preferred_geography", "storage_distribution", "allergens",
  ];
  return stableHash({
    fields: keys.map((key) => {
      const field = workspace.fields[key];
      return [key, field.value, field.status, field.validationStatus];
    }),
    packageCommit: hasValidFounderPackageCommit(workspace) ? workspace.packageCommit?.designHash : null,
  });
}

export function applyManufacturerResearch(
  workspace: SourcingWorkspace,
  request: ManufacturerResearchRequest,
  candidates: ManufacturerMatch[],
  broadeningApproval: ManufacturerResearchBroadeningApproval | null = null,
): SourcingWorkspace {
  const timestamp = now();
  const research = {
    id: randomUUID(),
    status: "current" as const,
    request,
    planFingerprint: manufacturerPlanFingerprint(workspace),
    candidates,
    candidateCount: candidates.length,
    ranAt: timestamp,
    invalidatedAt: null,
    broadeningApproval,
  };
  const researchActivity = broadeningApproval
    ? activity("research_broadened", "A broader manufacturer search was reviewed and approved by the founder.", {
        originalRequest: broadeningApproval.originalRequest,
        broadenedRequest: broadeningApproval.broadenedRequest,
        approvedBy: broadeningApproval.approvedBy,
        approvedAt: broadeningApproval.approvedAt,
        workspaceRevision: broadeningApproval.workspaceRevision,
        mutationId: broadeningApproval.mutationId,
      })
    : activity("matched", `${candidates.length} evidence-backed manufacturer match${candidates.length === 1 ? "" : "es"} prepared.`);
  return touch({
    ...workspace,
    manufacturerResearch: research,
    matches: candidates,
    matchesUpdatedAt: timestamp,
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs.filter((slug) => candidates.some((candidate) => candidate.manufacturerSlug === slug)),
    activity: addActivity(workspace.activity, researchActivity),
  }, timestamp);
}

export function getCurrentManufacturerResearch(workspace: SourcingWorkspace) {
  const research = workspace.manufacturerResearch;
  if (!research || research.status !== "current") return null;
  if (research.candidateCount !== research.candidates.length) return null;
  if (research.planFingerprint !== manufacturerPlanFingerprint(workspace)) return null;
  if (workspace.selectedManufacturerSlugs.some((slug) => !research.candidates.some((candidate) => candidate.manufacturerSlug === slug))) return null;
  return research;
}

export function invalidateManufacturerResearch(workspace: SourcingWorkspace): SourcingWorkspace {
  const timestamp = now();
  return {
    ...workspace,
    manufacturerResearch: workspace.manufacturerResearch
      ? { ...workspace.manufacturerResearch, status: "stale", invalidatedAt: timestamp }
      : null,
    matches: [],
    matchesUpdatedAt: null,
  };
}

function founderConfirmation(channel: "workspace_ui" | "founder_statement", confirmedAt: string, sourceRevision: number) {
  return { id: randomUUID(), actor: "founder" as const, channel, confirmedAt, sourceRevision };
}

const VALIDATION_SENSITIVE_KEYS = new Set<SourcingFieldKey>([
  "formula_status", "formulation_assistance", "manufacturing_process", "storage_distribution",
  "packaging_format", "packaging_size", "certifications", "allergens",
]);

function validationStatusFor(
  key: SourcingFieldKey,
  value: string | null,
  reason: string | undefined | null,
  previous: SourcingValidationStatus,
): SourcingValidationStatus {
  if (!value || !VALIDATION_SENSITIVE_KEYS.has(key)) return "not_required";
  if (key === "certifications") {
    const certifications = normalizeCertificationRequirements(value);
    if (!certifications.required.length && !certifications.preferred.length) return "not_required";
  }
  if (previous === "validated" && !reason) return "validated";
  return "needs_validation";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function addWorkspaceActivity(workspace: SourcingWorkspace, kind: WorkspaceActivity["kind"], message: string): SourcingWorkspace {
  return touch({ ...workspace, activity: addActivity(workspace.activity, activity(kind, message)) });
}

function addActivity(current: WorkspaceActivity[], next: WorkspaceActivity): WorkspaceActivity[] {
  return [next, ...current].slice(0, 20);
}
