import { FIELD_DEFINITION_BY_KEY, SOURCING_FIELD_DEFINITIONS } from "./fields";
import {
  getBrandName,
  getPackagingOptions,
  getProductCategory,
  getProductDescriptor,
  getProductName,
} from "./product-catalog";
import { getCategoryDecisionGuardrails, getSourcingQuestion } from "./questions";
import { getSourcingReadiness } from "./readiness";
import type { SourcingFieldKey, SourcingWorkspace } from "./types";

const VALIDATION_OWNERS: Partial<Record<SourcingFieldKey, string>> = {
  formula_status: "qualified product developer or manufacturer",
  formulation_assistance: "qualified product developer or manufacturer",
  manufacturing_process: "qualified manufacturer",
  storage_distribution: "qualified process and shelf-life specialist",
  packaging_format: "qualified manufacturer and packaging supplier",
  packaging_size: "qualified manufacturer and packaging supplier",
  certifications: "certification body and qualified manufacturer",
  allergens: "qualified food-safety and labeling specialist",
};

export function buildSourcingAgentState(workspace: SourcingWorkspace) {
  const readiness = getSourcingReadiness(workspace);
  const populatedFields = SOURCING_FIELD_DEFINITIONS
    .map((definition) => ({ definition, field: workspace.fields[definition.key] }))
    .filter(({ field }) => Boolean(field.value));
  const confirmed = populatedFields
    .filter(({ field }) => field.status === "confirmed")
    .map(({ definition, field }) => ({
      key: definition.key,
      label: definition.label,
      value: field.value!,
      source: field.source,
      explicitlyStated: field.explicitlyStated,
    }));
  const proposed = populatedFields
    .filter(({ field }) => field.status === "proposed")
    .map(({ definition, field }) => ({
      key: definition.key,
      label: definition.label,
      value: field.value!,
      reason: field.reason,
      source: field.source,
      evidence: (field.evidence ?? []).map((item) => ({
        title: item.title,
        url: item.url,
        claim: item.claim,
        reviewedAt: item.reviewedAt,
      })),
    }));
  const needsValidation = populatedFields
    .filter(({ definition, field }) => {
      if (!VALIDATION_OWNERS[definition.key]) return false;
      return field.status === "proposed" || /validat|confirm|commercial|shelf[- ]life|line compatibility/i.test(`${field.value} ${field.reason ?? ""}`);
    })
    .map(({ definition, field }) => ({
      key: definition.key,
      label: definition.label,
      currentDirection: field.value!,
      reason: field.reason || "This is useful planning context, not a validated production claim.",
      validationOwner: VALIDATION_OWNERS[definition.key],
    }));
  const founderDecisions = readiness.missingRequirements.slice(0, 1).map((key, index) => ({
    key,
    label: FIELD_DEFINITION_BY_KEY[key].label,
    question: getSourcingQuestion(workspace, key),
    whyItMatters: index === 0 && readiness.nextQuestionKey === key
      ? readiness.whyItMatters
      : FIELD_DEFINITION_BY_KEY[key].hint,
  }));
  const packagingOptions = getPackagingOptions(workspace).map(({ id, label, value, description }) => ({
    id,
    label,
    value,
    description,
  }));
  const currentSelections = new Set(workspace.selectedManufacturerSlugs);
  const currentMatchSlugs = new Set(workspace.matches.map((match) => match.manufacturerSlug));
  const selectedCurrentMatches = [...currentSelections].filter((slug) => currentMatchSlugs.has(slug));
  const eligibleOutreachDrafts = workspace.outreachDrafts.filter((draft) => {
    if (draft.packet.revokedAt || !currentSelections.has(draft.manufacturerSlug) || !currentMatchSlugs.has(draft.manufacturerSlug)) return false;
    return !workspace.matchesUpdatedAt || Date.parse(draft.createdAt) >= Date.parse(workspace.matchesUpdatedAt);
  });
  const currentOutreachDrafts = [...new Map(
    [...eligibleOutreachDrafts]
      .sort((left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt))
      .map((draft) => [draft.manufacturerSlug, draft]),
  ).values()];
  const packageDirectionAvailable = Boolean(workspace.fields.packaging_format.value);
  const brandName = getBrandName(workspace);
  const creativeReady = packageDirectionAvailable || Boolean(workspace.packageDesign);
  const creativeNextQuestion = !creativeReady || workspace.artwork
    ? null
    : brandName
      ? {
          key: "package_art_direction" as const,
          question: `What visual style should the package artwork use for ${brandName}? A rough direction like warm handmade, modern premium, or playful retail is enough.`,
        }
      : {
          key: "brand_name" as const,
          question: "What name should appear on the package, or should I create the artwork without a brand name for now?",
        };

  const recommendedAction = currentOutreachDrafts.length
    ? {
        type: "open_introduction_review" as const,
        instruction: "Open the exact introduction drafts for founder review. The founder must approve each exact version and separately confirm Send now; the agent cannot send.",
      }
    : readiness.manufacturerReady && selectedCurrentMatches.length
      ? {
          type: "prepare_introductions" as const,
          manufacturerSlugs: selectedCurrentMatches,
          instruction: "Prepare one current introduction draft per founder-selected manufacturer, then immediately open the exact-message review. Nothing is approved or sent by this action.",
        }
      : workspace.matches.length && !selectedCurrentMatches.length
        ? {
            type: "wait_for_founder_shortlist" as const,
            instruction: "Ask the founder to select up to three visible manufacturer possibilities. Selection is a human decision; do not choose on their behalf.",
          }
        : workspace.matchesUpdatedAt !== null && workspace.matches.length === 0
          ? {
              type: "review_no_match_result" as const,
              instruction: "Explain that the current search returned no responsible evidence-backed possibilities. Do not silently weaken founder requirements; ask whether confirmed must-haves should remain required or be retried as visible preferences.",
            }
        : founderDecisions.length
          ? {
              type: "ask_founder" as const,
              questions: [founderDecisions[0]],
              instruction: "Ask this one material decision, persist the answer, then read the workspace again before asking anything else. Accept a rough answer and keep uncertainty explicit.",
            }
        : !readiness.packageDesignReady && packageDirectionAvailable
          ? {
              type: "stage_package_design" as const,
              instruction: "Open a visible 3D package direction as a proposal. The founder must review it and use the visible commit control before it becomes canonical.",
            }
      : proposed.length
        ? {
            type: "review_proposals" as const,
            fieldKeys: proposed.map((item) => item.key),
            instruction: "Ask the founder to review the highlighted proposals instead of making them rewrite useful draft copy.",
          }
        : readiness.searchReady && (workspace.matchesUpdatedAt === null || workspace.matches.length === 0)
          ? {
              type: "research_manufacturers" as const,
              instruction: "Research a small evidence-backed set and keep conflicts and unknowns distinct from supported facts.",
            }
          : {
              type: "continue_from_visible_workspace" as const,
              instruction: "Use the visible workspace state and preserve founder approval boundaries.",
            };

  const availableActions = ["update_sourcing_workspace", "export_product_packet", "audit_outreach_readiness"];
  if (creativeReady) availableActions.push("preview_package_design", "generate_package_artwork", "stage_package_artwork");
  if (readiness.searchReady) availableActions.push("match_manufacturers");
  if (readiness.manufacturerReady && selectedCurrentMatches.length) availableActions.push("prepare_manufacturer_outreach");
  if (currentOutreachDrafts.length) availableActions.push("open_manufacturer_introduction_review");

  return {
    workspace: {
      id: workspace.id,
      revision: workspace.revision,
      originalIdea: workspace.originalIdea,
      updatedAt: workspace.updatedAt,
    },
    product: {
      name: getProductName(workspace),
      brandName,
      descriptor: getProductDescriptor(workspace),
      category: getProductCategory(workspace),
      artwork: workspace.artwork
        ? { id: workspace.artwork.id, fileName: workspace.artwork.fileName, contentType: workspace.artwork.contentType }
        : null,
    },
    stage: {
      label: readiness.stageLabel,
      summary: readiness.stageSummary,
      canResearch: readiness.searchReady,
      canPrepareManufacturerBrief: readiness.manufacturerReady,
      canPrepareOutreach: readiness.manufacturerReady && selectedCurrentMatches.length > 0,
      packageDesignReady: readiness.packageDesignReady,
    },
    requirements: {
      confirmed,
      proposed,
      needsValidation,
      open: readiness.missingRequirements.map((key) => ({ key, label: FIELD_DEFINITION_BY_KEY[key].label })),
    },
    founderDecisions,
    recommendedAction,
    availableActions,
    creative: {
      optional: true,
      status: !creativeReady
        ? "waiting_for_package_direction"
        : workspace.artwork
          ? "artwork_staged"
          : brandName
            ? "needs_art_direction"
            : "needs_brand_name",
      nextQuestion: creativeNextQuestion,
      workflow: ["ask_one_creative_question", "generate_package_artwork", "founder_reviews_in_3d", "refine_on_founder_request"],
      instruction: creativeNextQuestion
        ? "Ask this one simple question at the next natural packaging moment. Do not wait for the founder to discover that artwork creation is available. After the founder answers, call generate_package_artwork so the label is created, uploaded, and staged entirely through WebMCP. Never invent a brand or art direction."
        : workspace.artwork
          ? "Artwork is staged. Keep it visible in the 3D workbench and leave the final package commit to the founder."
          : "Choose a package direction before starting artwork so the generated asset can be judged on the real 3D form.",
      founderCommitRequired: true,
    },
    packaging: {
      saved: Boolean(workspace.packageDesign),
      direction: workspace.packageDesign,
      suggestedDirection: workspace.fields.packaging_format.value,
      options: packagingOptions,
      founderCommitRequired: true,
    },
    manufacturerCandidates: workspace.matches.map((match) => ({
      manufacturerSlug: match.manufacturerSlug,
      manufacturerName: match.manufacturerName,
      location: match.location,
      fitExplanation: match.fitExplanation,
      supported: match.supportedMatches,
      possibleConflicts: match.possibleConflicts,
      notPubliclyConfirmed: match.unknowns,
      introductionAvailable: match.introductionAvailable,
      lastReviewed: match.lastReviewed,
      evidence: match.evidence.map((item) => ({
        requirementKey: item.requirementKey,
        requirementLabel: item.requirementLabel,
        status: item.status,
        claim: item.claim,
        sourceUrl: item.sourceUrl,
        sourceLabel: item.sourceLabel,
        lastReviewed: item.lastReviewed,
        notes: item.notes,
      })),
    })),
    outreach: {
      selectedManufacturerSlugs: selectedCurrentMatches,
      pendingShortlistSlugs: [...currentSelections].filter((slug) => !currentMatchSlugs.has(slug)),
      drafts: currentOutreachDrafts.map((draft) => ({
        id: draft.id,
        manufacturerSlug: draft.manufacturerSlug,
        manufacturerName: draft.manufacturerName,
        warnings: draft.warnings,
        version: draft.version,
        approvedVersion: draft.approvedVersion,
        deliveryStatus: draft.deliveryStatus,
        updatedAt: draft.updatedAt,
      })),
      externalContactRequiresFounderAction: true,
      agentSendAvailable: false,
      status: currentOutreachDrafts.length
        ? "awaiting_founder_review"
        : readiness.manufacturerReady && selectedCurrentMatches.length
          ? "ready_to_prepare"
          : workspace.matches.length && !selectedCurrentMatches.length
            ? "awaiting_founder_selection"
            : "not_ready",
      finalSequence: [
        { step: "prepare_drafts", owner: "agent", complete: currentOutreachDrafts.length > 0 },
        { step: "review_and_approve_exact_version", owner: "founder", complete: currentOutreachDrafts.length > 0 && currentOutreachDrafts.every((draft) => draft.approvedVersion === draft.version && Boolean(draft.approvedAt)) },
        { step: "confirm_send_now", owner: "founder", complete: currentOutreachDrafts.length > 0 && currentOutreachDrafts.every((draft) => draft.deliveryStatus === "sent") },
      ],
    },
    canUndoAgentChange: Boolean(workspace.lastAgentChange),
    whatChanged: workspace.activity[0]?.message ?? null,
    decisionGuardrails: getCategoryDecisionGuardrails(workspace),
  };
}

export function buildOutreachReadinessAudit(workspace: SourcingWorkspace) {
  const state = buildSourcingAgentState(workspace);
  const selectionCount = state.outreach.selectedManufacturerSlugs.length;
  const candidateCount = state.manufacturerCandidates.length;
  const drafts = state.outreach.drafts;
  const matchingCurrent = workspace.matchesUpdatedAt !== null;
  const allDraftsApproved = drafts.length > 0
    && drafts.every((draft) => draft.approvedVersion === draft.version);
  const blockers: string[] = [];

  if (!matchingCurrent) blockers.push("Research evidence-backed manufacturer possibilities.");
  if (matchingCurrent && !candidateCount) blockers.push("The current research found no evidence-backed manufacturer possibilities. Review the brief or retry with visibly adjusted preferences.");
  if (candidateCount > 0 && !selectionCount) blockers.push("The founder selects up to three manufacturers to contact.");
  if (!state.stage.canPrepareManufacturerBrief) {
    const openLabels = state.requirements.open.map((field) => field.label);
    blockers.push(openLabels.length
      ? `Finish the manufacturer-brief decisions: ${openLabels.join(", ")}.`
      : "Review and save a supported 3D package direction for the manufacturer brief.");
  }
  if (state.stage.canPrepareManufacturerBrief && selectionCount > 0 && !drafts.length) {
    blockers.push("The agent prepares one current draft for each founder-selected manufacturer.");
  }
  if (drafts.length && !allDraftsApproved) blockers.push("The founder reviews and approves each exact draft version.");
  if (allDraftsApproved && drafts.some((draft) => draft.deliveryStatus !== "sent")) {
    blockers.push("The founder separately confirms Send now for each approved introduction.");
  }

  return {
    readyToPrepareDrafts: state.stage.canPrepareOutreach,
    matchingCurrent,
    manufacturerBriefReady: state.stage.canPrepareManufacturerBrief,
    packageDirectionSaved: state.packaging.saved,
    candidateCount,
    selectionCount,
    selectedManufacturerSlugs: state.outreach.selectedManufacturerSlugs,
    pendingShortlistSlugs: state.outreach.pendingShortlistSlugs,
    drafts,
    blockers,
    gates: [
      { step: "research_manufacturers", owner: "agent", status: matchingCurrent ? "complete" : "blocked" },
      { step: "select_manufacturers", owner: "founder", status: selectionCount ? "complete" : candidateCount > 0 ? "ready" : "blocked" },
      { step: "prepare_recipient_specific_drafts", owner: "agent", status: drafts.length ? "complete" : state.stage.canPrepareOutreach ? "ready" : "blocked" },
      { step: "review_and_approve_exact_versions", owner: "founder", status: allDraftsApproved ? "complete" : drafts.length ? "ready" : "blocked" },
      { step: "confirm_send_now", owner: "founder", status: drafts.length && drafts.every((draft) => draft.deliveryStatus === "sent") ? "complete" : allDraftsApproved ? "ready" : "blocked" },
    ],
    externalContactRequiresFounderAction: true,
    agentApprovalAvailable: false,
    agentSendAvailable: false,
    nothingWasSent: drafts.every((draft) => draft.deliveryStatus !== "sent"),
  };
}
