import { buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import type { ManufacturerMatch, OutreachDraft } from "@/lib/sourcing/types";
import { PackageDesignSchema } from "@/lib/sourcing/product-plan";
import { applyFounderFieldUpdate, applyManufacturerResearch, commitStagedPackageDesign, createWorkspace, stagePackageDesign } from "@/lib/sourcing/workspace";
import { describe, expect, it } from "vitest";

const BANANA_BREAD_IDEA = "Mya makes banana bread at home and we want to manufacture it and sell it in stores.";

describe("sourcing agent state", () => {
  it("serializes the banana-bread bootstrap as compact, actionable, human-gated state", () => {
    const state = buildSourcingAgentState(createWorkspace({ idea: BANANA_BREAD_IDEA }));

    expect(state.workspace.originalIdea).toBe(BANANA_BREAD_IDEA);
    expect(state.product).toMatchObject({
      name: "Packaged banana bread",
      brandName: null,
      descriptor: "Packaged banana bread",
      category: "bakery",
    });
    expect(state.requirements.confirmed).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "product_type", value: "Packaged banana bread", explicitlyStated: true }),
      expect.objectContaining({ key: "formula_status", value: "Existing home recipe", explicitlyStated: true }),
      expect.objectContaining({ key: "retail_channel", value: "Retail stores", explicitlyStated: true }),
    ]));
    expect(state.requirements.proposed).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "product_category", value: "Packaged bakery / quick bread" }),
      expect.objectContaining({ key: "product_description", value: expect.stringContaining("first-run volume remain open") }),
      expect.objectContaining({ key: "packaging_format", value: "Windowed bakery bag or flow wrap" }),
    ]));
    expect(state.requirements.needsValidation).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "formula_status", validationOwner: "qualified product developer or manufacturer" }),
      expect.objectContaining({
        key: "packaging_format",
        reason: expect.stringContaining("require manufacturer validation"),
        validationOwner: "qualified manufacturer and packaging supplier",
      }),
    ]));
    expect(state.requirements.open.map(({ key }) => key)).toEqual([
      "product_format",
      "storage_distribution",
      "production_volume",
      "packaging_size",
    ]);
    expect(state.founderDecisions.map(({ key }) => key)).toEqual([
      "product_format",
    ]);

    expect(state).not.toHaveProperty("fields");
    expect(state.workspace).not.toHaveProperty("fields");
    expect(state).not.toHaveProperty("lastAgentChange");
    expect(state.stage).not.toHaveProperty("percent");
    expect(JSON.stringify(state)).not.toContain('"lastAgentChange"');
    expect(JSON.stringify(state)).not.toContain('"percent"');
    expect(JSON.stringify(state)).not.toContain('"fields"');

    expect(state.recommendedAction).toMatchObject({
      type: "ask_founder",
      questions: [expect.objectContaining({ key: "product_format" })],
    });
    expect(state.availableActions).toEqual(expect.arrayContaining([
      "update_sourcing_workspace",
      "export_product_packet",
      "preview_package_design",
      "generate_package_artwork",
      "stage_package_artwork",
      "match_manufacturers",
    ]));
    expect(state.creative).toMatchObject({
      optional: true,
      status: "needs_brand_name",
      nextQuestion: {
        key: "brand_name",
        question: "What name should appear on the package, or should I create the artwork without a brand name for now?",
      },
      founderCommitRequired: true,
    });
    expect(state.creative.workflow).toEqual([
      "ask_one_creative_question",
      "generate_package_artwork",
      "founder_reviews_in_3d",
      "refine_on_founder_request",
    ]);
    expect(state.availableActions).not.toContain("prepare_manufacturer_outreach");
    expect(state.packaging).toMatchObject({ saved: false, founderCommitRequired: true });
    expect(state.packaging.options).toEqual([
      expect.objectContaining({ id: "bakery-bag", value: "Bakery Bag" }),
    ]);
    expect(state.outreach).toMatchObject({
      externalContactRequiresFounderAction: true,
      agentSendAvailable: false,
    });
    expect(state.canUndoAgentChange).toBe(true);
  });

  it("asks for one art direction after a brand is known, then stops asking once artwork is staged", () => {
    const workspace = createWorkspace({
      idea: BANANA_BREAD_IDEA,
      initialUpdates: [{
        key: "brand_name",
        value: "Mya's",
        status: "confirmed",
        explicitlyStated: true,
        suggestedSharing: true,
      }],
    });

    const needsArtwork = buildSourcingAgentState(workspace);
    expect(needsArtwork.creative).toMatchObject({
      status: "needs_art_direction",
      nextQuestion: {
        key: "package_art_direction",
        question: expect.stringContaining("What visual style should the package artwork use for Mya's?"),
      },
    });

    const artworkStaged = buildSourcingAgentState({
      ...workspace,
      artwork: {
        id: "artwork-1",
        fileName: "myas-banana-bread.png",
        contentType: "image/png",
        byteSize: 42_000,
        createdAt: "2026-08-30T12:00:00.000Z",
      },
    });
    expect(artworkStaged.creative).toMatchObject({
      status: "artwork_staged",
      nextQuestion: null,
      founderCommitRequired: true,
    });
  });

  it("keeps a zero-result decision as the next action after the workspace is read again", () => {
    const workspace = applyManufacturerResearch(createWorkspace({ idea: BANANA_BREAD_IDEA }), {
      geographyPreference: null,
      resultLimit: 3,
      requiredRequirements: [],
      preferredRequirements: [],
    }, []);
    const state = buildSourcingAgentState(workspace);

    expect(state.recommendedAction).toMatchObject({
      type: "review_no_match_result",
      instruction: expect.stringContaining("Do not silently weaken"),
    });
  });

  it("applies initial updates after starter proposals without weakening provenance or evidence", () => {
    const sourceUrl = "https://example.com/bakery-packaging";
    const workspace = createWorkspace({
      idea: BANANA_BREAD_IDEA,
      initialUpdates: [
        {
          key: "product_category",
          value: "Retail bakery product",
          status: "confirmed",
          explicitlyStated: true,
          source: "Founder statement captured by agent",
          suggestedSharing: true,
        },
        {
          key: "packaging_format",
          value: "Windowed paper bakery bag",
          status: "confirmed",
          explicitlyStated: false,
          source: "Agent packaging research",
          reason: "A useful direction that still requires manufacturer validation for material, seal, shelf life, and line compatibility.",
          suggestedSharing: true,
          sources: [{
            title: "Bakery packaging overview",
            url: sourceUrl,
            claim: "Windowed bakery bags are publicly described as a retail packaging option.",
            publisher: "Example Packaging",
            reviewedAt: "2026-08-30T12:00:00.000Z",
          }],
        },
      ],
    });

    expect(workspace.fields.product_category).toMatchObject({
      value: "Retail bakery product",
      status: "confirmed",
      explicitlyStated: true,
      updatedBy: "agent",
      source: "Founder statement captured by agent",
    });
    expect(workspace.fields.packaging_format).toMatchObject({
      value: "Windowed paper bakery bag",
      status: "proposed",
      explicitlyStated: false,
      updatedBy: "agent",
      source: "Agent packaging research",
    });

    const match: ManufacturerMatch = {
      manufacturerSlug: "example-bakery",
      manufacturerName: "Example Bakery Manufacturing",
      location: "Austin, Texas",
      fitExplanation: "Reviewed public information supports packaged bakery production; exact package compatibility remains open.",
      supportedMatches: ["Public product information includes packaged bakery products."],
      possibleConflicts: [],
      unknowns: ["The windowed paper bag format is not publicly confirmed."],
      evidence: [{
        requirementKey: "product_type",
        requirementLabel: "Product",
        claim: "The public capabilities page lists packaged bakery production.",
        status: "publicly_listed",
        sourceType: "company_published",
        sourceUrl: "https://example.com/manufacturing-capabilities",
        sourceLabel: "Manufacturing capabilities",
        lastReviewed: "2026-08-30",
        confidence: null,
        notes: "Exact banana-bread and package fit still require direct confirmation.",
      }],
      requirementsUsed: ["product_type"],
      introductionAvailable: true,
      deliveryMethod: "line_list_introduction",
      lastReviewed: "2026-08-30",
    };
    const staleDraft: OutreachDraft = {
      id: "stale-draft",
      manufacturerSlug: match.manufacturerSlug,
      manufacturerName: match.manufacturerName,
      subject: "Earlier introduction",
      body: "Earlier product snapshot",
      questions: [],
      includedFieldKeys: ["product_type"],
      excludedFieldKeys: [],
      warnings: [],
      packet: {
        token: "stale-token",
        manufacturerSlug: match.manufacturerSlug,
        manufacturerName: match.manufacturerName,
        includedFieldKeys: ["product_type"],
        fieldValues: { product_type: "Packaged banana bread" },
        questions: [],
        createdAt: "2026-08-30T12:00:00.000Z",
        expiresAt: "2026-09-06T12:00:00.000Z",
        revokedAt: null,
      },
      availableDeliveryMethod: "line_list_introduction",
      demoRecipient: null,
      recipientEmail: null,
      founderCopyEmail: null,
      version: 1,
      approvedVersion: null,
      approvedAt: null,
      sentAt: null,
      deliveryStatus: "draft",
      deliveryError: null,
      humanSendTokenHash: null,
      humanSendTokenExpiresAt: null,
      createdAt: "2026-08-30T12:00:00.000Z",
      updatedAt: "2026-08-30T12:00:00.000Z",
    };
    const researched = applyManufacturerResearch(workspace, {
      geographyPreference: null,
      resultLimit: 3,
      requiredRequirements: [],
      preferredRequirements: [],
    }, [match]);
    const state = buildSourcingAgentState({
      ...researched,
      selectedManufacturerSlugs: [match.manufacturerSlug],
      outreachDrafts: [staleDraft],
    });

    expect(state.requirements.proposed.find(({ key }) => key === "packaging_format")?.evidence).toEqual([{
      title: "Bakery packaging overview",
      url: sourceUrl,
      claim: "Windowed bakery bags are publicly described as a retail packaging option.",
      reviewedAt: "2026-08-30T12:00:00.000Z",
    }]);
    expect(state.manufacturerCandidates[0].evidence).toEqual([expect.objectContaining({
      requirementKey: "product_type",
      status: "publicly_listed",
      sourceUrl: "https://example.com/manufacturing-capabilities",
      sourceLabel: "Manufacturing capabilities",
      lastReviewed: "2026-08-30",
      notes: "Exact banana-bread and package fit still require direct confirmation.",
    })]);
    expect(state.outreach.selectedManufacturerSlugs).toEqual([match.manufacturerSlug]);
    expect(state.outreach.drafts).toEqual([]);
    expect(state.stage.canPrepareOutreach).toBe(false);
    expect(state.availableActions).not.toContain("prepare_manufacturer_outreach");
    expect(state.availableActions).not.toContain("open_manufacturer_introduction_review");
    expect(state.outreach.externalContactRequiresFounderAction).toBe(true);
    expect(state.outreach.agentSendAvailable).toBe(false);
  });

  it("keeps explicit founder answers confirmed while preserving separate professional validation", () => {
    const workspace = createWorkspace({
      idea: BANANA_BREAD_IDEA,
      initialUpdates: [
        {
          key: "packaging_format",
          value: "Windowed bakery bag",
          status: "confirmed",
          explicitlyStated: true,
          source: "Founder statement captured by agent",
          reason: "The founder explicitly chose this direction; material, seal, shelf life, and line compatibility still need manufacturer validation.",
          suggestedSharing: true,
        },
        {
          key: "storage_distribution",
          value: "Room temperature",
          status: "confirmed",
          explicitlyStated: true,
          source: "Founder statement captured by agent",
          reason: "The founder explicitly stated the intended storage direction; shelf life still needs qualified validation.",
          suggestedSharing: true,
        },
      ],
    });
    const state = buildSourcingAgentState(workspace);

    expect(state.requirements.confirmed).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "packaging_format", value: "Windowed bakery bag", explicitlyStated: true }),
      expect.objectContaining({ key: "storage_distribution", value: "Room temperature", explicitlyStated: true }),
    ]));
    expect(state.requirements.proposed.map(({ key }) => key)).not.toContain("packaging_format");
    expect(state.requirements.needsValidation).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "packaging_format", validationOwner: "qualified manufacturer and packaging supplier" }),
      expect.objectContaining({ key: "storage_distribution", validationOwner: "qualified process and shelf-life specialist" }),
    ]));
  });

  it("refreshes starter copy from confirmed answers without lowercasing H-E-B or retaining resolved open fields", () => {
    const workspace = createWorkspace({
      idea: BANANA_BREAD_IDEA,
      initialUpdates: [
        { key: "product_type", value: "packaged banana bread", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "retail_channel", value: "H-E-B stores", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_format", value: "Full retail loaf", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "storage_distribution", value: "Room temperature", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "production_volume", value: "2,000 units", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      ],
    });
    const description = workspace.fields.product_description.value ?? "";

    expect(description).toMatch(/^Packaged banana bread/);
    expect(description).toContain("intended for H-E-B stores");
    expect(description).toContain("planned for room temperature");
    expect(description).toContain("with an initial volume of 2,000 units");
    expect(description).not.toContain("h-E-B");
    expect(description).not.toMatch(/product format|storage,? and first-run volume|remain open/i);
  });

  it("ends with agent draft preparation followed by review, approval, and send gates owned by the founder", () => {
    let workspace = createWorkspace({ idea: BANANA_BREAD_IDEA });
    for (const update of [
      { key: "product_format", value: "Full retail loaf" },
      { key: "storage_distribution", value: "Shelf-stable goal" },
      { key: "production_volume", value: "1,000 to 5,000 units" },
      { key: "packaging_size", value: "14 oz loaf" },
      { key: "packaging_format", value: "Windowed bakery bag" },
      { key: "product_description", value: "A full retail banana-bread loaf for shelf-stable grocery distribution, starting at 1,000 to 5,000 units." },
    ] as const) {
      workspace = applyFounderFieldUpdate(workspace, { ...update, status: "confirmed", shareWithManufacturer: true });
    }
    const packageDesign = PackageDesignSchema.parse({
      packagingType: "bakery-bag",
      finish: "colored",
      baseColor: "#f4ede1",
      labelColor: "#0e382f",
      artworkId: null,
      logoAspect: 1,
      logoScale: 1,
      logoPosition: { x: 0, y: 0.2 },
      windowScale: 1,
      windowPosition: { x: 0, y: -0.2 },
      frontText: { brand: "Mya's", product: "Banana Bread" },
      dimensions: { width: null, height: null, depth: null },
      summary: "Windowed bakery bag · 14 oz loaf",
    });
    workspace = stagePackageDesign(workspace, { stageId: "agent-state-stage-design-001", packageDesign, stagedBy: "founder" });
    workspace = commitStagedPackageDesign(workspace, { commitId: "agent-state-commit-design-01", stagedPackageId: workspace.stagedPackageDesign!.id });

    const match: ManufacturerMatch = {
      manufacturerSlug: "example-bakery",
      manufacturerName: "Example Bakery Manufacturing",
      location: "Austin, Texas",
      fitExplanation: "A possibility to investigate.",
      supportedMatches: [],
      possibleConflicts: [],
      unknowns: ["Exact fit requires a direct conversation."],
      evidence: [],
      requirementsUsed: ["product_type"],
      introductionAvailable: true,
      deliveryMethod: "line_list_introduction",
      lastReviewed: "2026-08-30",
    };
    workspace = applyManufacturerResearch(workspace, {
      geographyPreference: null,
      resultLimit: 3,
      requiredRequirements: [],
      preferredRequirements: [],
    }, [match]);
    workspace = { ...workspace, selectedManufacturerSlugs: [match.manufacturerSlug] };
    const researchRanAt = workspace.manufacturerResearch!.ranAt;

    const ready = buildSourcingAgentState(workspace);
    expect(ready.recommendedAction).toMatchObject({ type: "prepare_introductions", manufacturerSlugs: [match.manufacturerSlug] });
    expect(ready.outreach).toMatchObject({
      status: "ready_to_prepare",
      agentSendAvailable: false,
      finalSequence: [
        { step: "prepare_drafts", owner: "agent", complete: false },
        { step: "review_and_approve_exact_version", owner: "founder", complete: false },
        { step: "confirm_send_now", owner: "founder", complete: false },
      ],
    });

    const draft: OutreachDraft = {
      id: "draft-1",
      manufacturerSlug: match.manufacturerSlug,
      manufacturerName: match.manufacturerName,
      subject: "Introduction request",
      body: "Please review this product brief.",
      questions: [],
      includedFieldKeys: ["product_type"],
      excludedFieldKeys: [],
      warnings: [],
      packet: {
        token: "packet-token",
        manufacturerSlug: match.manufacturerSlug,
        manufacturerName: match.manufacturerName,
        includedFieldKeys: ["product_type"],
        fieldValues: { product_type: "Packaged banana bread" },
        questions: [],
        createdAt: "2026-08-30T12:06:00.000Z",
        expiresAt: "2026-09-06T12:06:00.000Z",
        revokedAt: null,
      },
      availableDeliveryMethod: "line_list_introduction",
      demoRecipient: null,
      recipientEmail: null,
      founderCopyEmail: null,
      version: 1,
      approvedVersion: null,
      approvedAt: null,
      sentAt: null,
      deliveryStatus: "draft",
      deliveryError: null,
      humanSendTokenHash: null,
      humanSendTokenExpiresAt: null,
      createdAt: researchRanAt,
      updatedAt: researchRanAt,
    };
    const olderDraft = {
      ...draft,
      id: "draft-old",
      createdAt: new Date(Date.parse(researchRanAt) - 1).toISOString(),
      updatedAt: new Date(Date.parse(researchRanAt) - 1).toISOString(),
    };
    const review = buildSourcingAgentState({ ...workspace, outreachDrafts: [olderDraft, draft] });
    expect(review.recommendedAction.type).toBe("open_introduction_review");
    expect(review.outreach.status).toBe("awaiting_founder_review");
    expect(review.outreach.drafts).toHaveLength(1);
    expect(review.outreach.drafts[0].id).toBe(draft.id);
    expect(review.availableActions).toContain("open_manufacturer_introduction_review");
    expect(review.outreach.agentSendAvailable).toBe(false);
  });
});
