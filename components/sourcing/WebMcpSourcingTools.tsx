"use client";

import { useEffect, useRef } from "react";
import { buildOutreachReadinessAudit, buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import { getGeographyMatchPreflight } from "@/lib/sourcing/geography";
import { MATCHABLE_REQUIREMENT_KEYS } from "@/lib/sourcing/matching-requirements";
import { getPackageArtworkRenderPlan, PACKAGE_ARTWORK_ASPECT, type PackageArtworkMotif, type PackageArtworkMotifRenderPlan, type PackageArtworkStyle } from "@/lib/sourcing/package-artwork";
import { getProductCategory, type ProductCategory } from "@/lib/sourcing/product-category";
import { SOURCING_FIELD_KEYS, type PackageDesignPreviewInput, type SourcingWorkspace } from "@/lib/sourcing/types";
import type { PackageStageResult } from "./SourcingWorkspaceContext";

interface ToolResponse { workspace?: SourcingWorkspace; receipt?: Record<string, unknown>; error?: string }

async function api<T extends ToolResponse>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await response.json() as T;
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

export function WebMcpSourcingTools({
  workspaceId,
  onWorkspaceChanged,
  onOpenManufacturerMatches,
  onOpenIntroductionReview,
  onPreviewPackageDesign,
}: {
  workspaceId: string;
  onWorkspaceChanged: (workspace: SourcingWorkspace) => void;
  onOpenManufacturerMatches: () => void;
  onOpenIntroductionReview: () => void;
  onPreviewPackageDesign: (preview: PackageDesignPreviewInput, workspace?: SourcingWorkspace, stageId?: string, stagedBy?: "agent" | "founder") => Promise<PackageStageResult>;
}) {
  const callbacksRef = useRef({ onWorkspaceChanged, onOpenManufacturerMatches, onOpenIntroductionReview, onPreviewPackageDesign });
  useEffect(() => {
    callbacksRef.current = { onWorkspaceChanged, onOpenManufacturerMatches, onOpenIntroductionReview, onPreviewPackageDesign };
  }, [onOpenIntroductionReview, onOpenManufacturerMatches, onPreviewPackageDesign, onWorkspaceChanged]);

  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const fieldKeys = [...SOURCING_FIELD_KEYS];
    const matchableRequirementKeys = [...MATCHABLE_REQUIREMENT_KEYS];
    const ensureActiveWorkspace = () => {
      const routeWorkspaceId = window.location.pathname.match(/^\/sourcing\/([^/]+)/)?.[1];
      if (controller.signal.aborted || routeWorkspaceId !== workspaceId) {
        throw new Error(`This WebMCP tool handle is stale for workspace ${workspaceId}. Refetch the tools registered on the current workspace before retrying; no mutation was attempted.`);
      }
    };
    const workspaceApi = <T extends ToolResponse>(url: string, init?: RequestInit) => {
      ensureActiveWorkspace();
      return api<T>(url, { ...init, signal: controller.signal });
    };
    const withGuidance = (body: ToolResponse, metadata: Record<string, unknown> = {}) => {
      if (body.workspace) callbacksRef.current.onWorkspaceChanged(body.workspace);
      if (!body.workspace) return body.error ? { error: body.error, ...metadata } : metadata;
      return {
        ...buildSourcingAgentState(body.workspace),
        receipt: body.receipt ? {
          ...body.receipt,
          currentWorkspaceId: body.workspace.id,
          refetchSafe: true,
          replayGuidance: body.receipt.mutation === "stage_package_design"
            ? {
                replaySafe: true,
                idField: "stageId",
                exactPayloadRequired: true,
                changedPayloadRequiresNewId: true,
                instruction: "Reuse this stageId only when replaying the exact same full package design. After refetch, treat the returned workspace and staged record as authoritative.",
              }
            : undefined,
        } : {
          authoritative: true,
          outcome: metadata.committed === false ? "staged" : "succeeded",
          workspaceId: body.workspace.id,
          currentWorkspaceId: body.workspace.id,
          revision: body.workspace.revision,
          refetchSafe: true,
        },
        ...metadata,
      };
    };

    const tools: WebMcpToolDefinition[] = [
      {
        name: "get_sourcing_workspace",
        title: "Read sourcing workspace",
        description: "Read a compact, action-oriented view of the canonical ProductPlan on this page. Confirmed facts, proposals, validation needs, and open founder decisions stay distinct. Follow recommendedAction and ask only its single founder question, then persist the answer and read again. When creative.nextQuestion is present, proactively ask it at the next natural packaging moment instead of waiting for the founder to discover artwork creation. Brand and artwork stay optional and never block manufacturer research. The final sequence is always agent-prepared introduction drafts, founder review and approval, then a separate founder-only Send now confirmation. Preserve founder decisions, keep uncertainty explicit, and never ask for a workspace ID.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          return withGuidance(await workspaceApi(`/api/sourcing/${workspaceId}`));
        },
      },
      {
        name: "update_sourcing_workspace",
        title: "Propose sourcing brief updates",
        description: "Update the canonical ProductPlan from the conversation. Capture every explicit founder decision in one call when possible. Keep originalIdea, brand_name, and product_type distinct; never invent a brand. Mark a value confirmed only when the founder stated it clearly. Research-backed or inferred directions remain proposed with sources and validation language. Never make a visual packaging change through a text field alone: use preview_package_design or refine_package_design_in_3d so the founder sees it. The page visibly highlights proposals, lets the founder accept them, and lets the founder undo the latest agent change.",
        inputSchema: {
          type: "object",
          properties: {
            proposedUpdates: {
              type: "array", minItems: 1, maxItems: fieldKeys.length,
              items: {
                type: "object",
                properties: {
                  key: { type: "string", enum: fieldKeys },
                  value: { type: ["string", "null"] },
                  reason: { type: "string" },
                  source: { type: "string" },
                  explicitlyStated: { type: "boolean" },
                  status: { type: "string", enum: ["confirmed", "proposed", "needs_decision"] },
                  suggestedSharing: { type: "boolean" },
                  sources: {
                    type: "array", maxItems: 8,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        claim: { type: "string" },
                        publisher: { type: "string" },
                        reviewedAt: { type: "string" },
                      },
                      required: ["title", "url", "claim"], additionalProperties: false,
                    },
                  },
                },
                required: ["key", "value", "status"],
                additionalProperties: false,
              },
            },
          },
          required: ["proposedUpdates"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as Record<string, unknown>;
          const current = await workspaceApi(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          const body = await workspaceApi(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ revision: current.workspace.revision, proposedUpdates: args.proposedUpdates }) });
          return withGuidance(body);
        },
      },
      {
        name: "get_package_design",
        title: "Read packaging direction",
        description: "Read the current packaging direction, artwork state, creative.nextQuestion, and category-relevant options. Use this before proposing a visual change. If creative.nextQuestion is present, ask it before generating artwork: brand name first, then art direction. After the founder answers, the host can generate a raster asset and pass it to stage_package_artwork. Bakery products support a real windowed bakery-bag preview with exact editable front text. Every 3D direction remains staged until the founder visibly commits it.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await workspaceApi(`/api/sourcing/${workspaceId}`);
          return withGuidance(body, {
            previewCapabilities: {
              bakeryBag: {
                packagingType: "bakery-bag",
                exactFrontText: true,
                windowScale: { minimum: 0.35, maximum: 1, default: 0.72 },
                copyPosition: { x: { minimum: -0.34, maximum: 0.34 }, y: { minimum: -0.18, maximum: 0.21 } },
                founderCommitRequired: true,
              },
            },
          });
        },
      },
      {
        name: "preview_package_design",
        title: "Preview packaging in 3D",
        description: "Stage any subset of packaging choices in the visible 3D workbench for founder review. Supply one opaque stageId and reuse it only for an exact retry of the same choices; changed choices require a new stageId. Use bakery-bag with frontText and windowScale for bread instead of substituting a generic pouch. Exact copy is rendered deterministically, and logoPosition.y moves the front copy vertically. Omit choices the founder has not made. A geometry-only request uses visibly labeled placeholder styling until the founder supplies visual parameters or approved artwork. The server persists the resulting complete design, so route changes and reloads keep the stage. This does not commit or change matching; only the founder's visible Use this package direction button can commit it.",
        inputSchema: {
          type: "object",
          properties: {
            stageId: { type: "string", minLength: 20, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" },
            packagingType: { type: "string", enum: ["slim-can", "bottle", "jar", "stand-up-pouch", "bakery-bag"] },
            finish: { type: "string", enum: ["colored", "clear"] },
            baseColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            labelColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            artworkId: { type: ["string", "null"] },
            logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
            logoScale: { type: "number", minimum: 0.05, maximum: 3 },
            logoPosition: { type: "object", properties: { x: { type: "number", minimum: -2, maximum: 2 }, y: { type: "number", minimum: -2, maximum: 2 } }, additionalProperties: false },
            frontText: { type: ["object", "null"], properties: { brand: { type: "string", maxLength: 120 }, product: { type: "string", maxLength: 160 } }, required: ["brand", "product"], additionalProperties: false },
            windowScale: { type: "number", minimum: 0, maximum: 1 },
            closure: {
              type: ["object", "null"],
              properties: { style: { type: "string", minLength: 1, maxLength: 120 }, color: { type: ["string", "null"], pattern: "^#[0-9a-fA-F]{6}$" } },
              required: ["style", "color"],
              additionalProperties: false,
            },
            dimensions: { type: "object", properties: { width: { type: ["number", "null"], minimum: 0, maximum: 10000 }, height: { type: ["number", "null"], minimum: 0, maximum: 10000 }, depth: { type: ["number", "null"], minimum: 0, maximum: 10000 } }, additionalProperties: false },
            summary: { type: "string", maxLength: 500 },
          },
          required: ["stageId"],
          minProperties: 2,
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          ensureActiveWorkspace();
          const { stageId, ...preview } = input as PackageDesignPreviewInput & { stageId: string };
          const staged = await callbacksRef.current.onPreviewPackageDesign(preview, undefined, stageId, "agent");
          return withGuidance(staged, { previewOpened: true, committed: false, preview: staged.preview, humanActionRequired: "The founder must review the persisted staged 3D direction and click Use this package direction to commit that exact version." });
        },
      },
      {
        name: "stage_package_artwork",
        title: "Stage generated package artwork",
        description: "Complete the creative handoff by uploading founder-requested generated logo or label artwork and opening it on the visible 3D package. Supply one opaque stageId and reuse it only for an exact retry; changed artwork or package state requires a new stageId. Before using this tool, read creative.nextQuestion and ask the founder one simple question if a brand name or art direction is still missing; never invent either. Generate the requested raster artwork with the host image generator, then pass PNG, JPEG, or WebP bytes encoded as base64, up to 2 MB. The upload becomes a workspace asset and the complete package state is persisted as a stage, but it does not commit a packaging direction or affect matching until the founder uses the visible package direction.",
        inputSchema: {
          type: "object",
          properties: {
            stageId: { type: "string", minLength: 20, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" },
            fileName: { type: "string", minLength: 1, maxLength: 140 },
            contentType: { type: "string", enum: ["image/png", "image/jpeg", "image/webp"] },
            base64Data: { type: "string", minLength: 4, maxLength: 2800000 },
            logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
          },
          required: ["stageId", "fileName", "contentType", "base64Data"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          ensureActiveWorkspace();
          const args = input as { stageId: string; fileName: string; contentType: "image/png" | "image/jpeg" | "image/webp"; base64Data: string; logoAspect?: number };
          const bytes = decodeBase64Artwork(args.base64Data);
          if (bytes.byteLength > 2 * 1024 * 1024) throw new Error("Artwork must be 2 MB or smaller.");
          const form = new FormData();
          form.set("artwork", new File([bytes.buffer as ArrayBuffer], args.fileName, { type: args.contentType }));
          ensureActiveWorkspace();
          const response = await fetch(`/api/sourcing/${workspaceId}/artwork`, { method: "POST", body: form, cache: "no-store" });
          const body = await response.json().catch(() => ({})) as ToolResponse & { artworkUrl?: string };
          if (!response.ok || !body.workspace?.artwork) throw new Error(body.error || `Artwork upload failed (${response.status}).`);
          callbacksRef.current.onWorkspaceChanged(body.workspace);
          const preview: PackageDesignPreviewInput = { artworkId: body.workspace.artwork.id, ...(args.logoAspect ? { logoAspect: args.logoAspect } : {}) };
          const staged = await callbacksRef.current.onPreviewPackageDesign(preview, body.workspace, args.stageId, "agent");
          return withGuidance(staged, { artworkUrl: body.artworkUrl, preview: staged.preview, previewOpened: true, committed: false, humanActionRequired: "The founder must visually review the persisted artwork stage and click Use this package direction to commit that exact version." });
        },
      },
      {
        name: "generate_package_artwork",
        title: "Create and stage package artwork",
        description: "Create a polished raster label inside this WebMCP tool from the founder-approved brand and visual direction, upload it to the product workspace, and open it on the visible 3D package. Supply one opaque stageId and reuse it only for an exact retry; changed artwork or package state requires a new stageId. Use this when WebMCP-only operation is required. Ask creative.nextQuestion first, never invent the brand or style, and pass founderApproved true only after the founder explicitly answers. The complete resulting package is persisted as a stage for visual review and never commits the package direction.",
        inputSchema: {
          type: "object",
          properties: {
            stageId: { type: "string", minLength: 20, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" },
            artDirection: { type: "string", minLength: 3, maxLength: 500 },
            style: { type: "string", enum: ["warm-handmade", "modern-premium", "playful-retail"] },
            accentColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            founderApproved: { type: "boolean", const: true },
          },
          required: ["stageId", "artDirection", "style", "founderApproved"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as { stageId: string; artDirection: string; style: PackageArtworkStyle; accentColor?: string; founderApproved: boolean };
          if (args.founderApproved !== true) throw new Error("Ask the founder for the package art direction before creating artwork.");
          const current = await workspaceApi(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          const brand = current.workspace.fields.brand_name.value?.trim();
          if (!brand) throw new Error("Ask what brand name should appear on the package before creating artwork.");
          const product = current.workspace.fields.product_type.value?.trim() || current.workspace.fields.product_name.value?.trim() || "Product";
          const artwork = await renderPackageArtwork({ brand, product, category: getProductCategory(current.workspace), artDirection: args.artDirection, style: args.style, accentColor: args.accentColor });
          const form = new FormData();
          form.set("artwork", new File([artwork.blob], `${slugify(brand)}-${args.style}-label.png`, { type: "image/png" }));
          ensureActiveWorkspace();
          const response = await fetch(`/api/sourcing/${workspaceId}/artwork`, { method: "POST", body: form, cache: "no-store" });
          const body = await response.json().catch(() => ({})) as ToolResponse & { artworkUrl?: string };
          if (!response.ok || !body.workspace?.artwork) throw new Error(body.error || `Artwork creation failed (${response.status}).`);
          const staged = await callbacksRef.current.onPreviewPackageDesign({
            artworkId: body.workspace.artwork.id,
            logoAspect: artwork.aspect,
          }, body.workspace, args.stageId, "agent");
          return withGuidance(staged, {
            artworkUrl: body.artworkUrl,
            artDirection: args.artDirection,
            artworkStyle: args.style,
            visualSignature: artwork.visualSignature,
            renderedMotifs: artwork.motifs,
            preview: staged.preview,
            previewOpened: true,
            committed: false,
            refinement: {
              available: true,
              instruction: "If the founder asks for a change, keep their brand and product copy fixed, change only the requested visual direction, and call generate_package_artwork again. Each new direction remains staged until the founder uses it.",
            },
            humanActionRequired: "The founder must visually review the generated artwork on the 3D package and click Use this package direction to commit it.",
          });
        },
      },
      {
        name: "refine_package_design_in_3d",
        title: "Refine packaging direction in 3D",
        description: "Open a complete founder-requested packaging direction in the visible 3D workbench. Supply one opaque stageId and reuse it only for an exact retry of this full design; any changed design requires a new stageId. For bakery-bag, preserve exact frontText, windowScale, closure, and copy placement. Do not invent a brand, colors, dimensions, artwork, closure, or placement. This persists the complete stage across routes and reloads for visual review; only the founder's visible Use this package direction button can make that exact staged design canonical.",
        inputSchema: {
          type: "object",
          properties: {
            packageDesign: {
              type: "object",
              properties: {
                packagingType: { type: "string", enum: ["slim-can", "bottle", "jar", "stand-up-pouch", "bakery-bag"] },
                finish: { type: "string", enum: ["colored", "clear"] },
                baseColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                labelColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                artworkId: { type: ["string", "null"] },
                logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
                logoScale: { type: "number", minimum: 0.05, maximum: 3 },
                logoPosition: { type: "object", properties: { x: { type: "number", minimum: -2, maximum: 2 }, y: { type: "number", minimum: -2, maximum: 2 } }, required: ["x", "y"], additionalProperties: false },
                frontText: { type: ["object", "null"], properties: { brand: { type: "string", maxLength: 120 }, product: { type: "string", maxLength: 160 } }, required: ["brand", "product"], additionalProperties: false },
                windowScale: { type: "number", minimum: 0, maximum: 1 },
                closure: {
                  type: ["object", "null"],
                  properties: { style: { type: "string", minLength: 1, maxLength: 120 }, color: { type: ["string", "null"], pattern: "^#[0-9a-fA-F]{6}$" } },
                  required: ["style", "color"],
                  additionalProperties: false,
                },
                dimensions: { type: "object", properties: { width: { type: ["number", "null"] }, height: { type: ["number", "null"] }, depth: { type: ["number", "null"] } }, required: ["width", "height", "depth"], additionalProperties: false },
                summary: { type: "string" },
              },
              required: ["packagingType", "finish", "baseColor", "labelColor", "artworkId", "frontText", "windowScale", "closure", "logoAspect", "logoScale", "logoPosition", "dimensions", "summary"],
              additionalProperties: false,
            },
            stageId: { type: "string", minLength: 20, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" },
            explicitlyStated: { type: "boolean", const: true },
          },
          required: ["packageDesign", "stageId", "explicitlyStated"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as { packageDesign: PackageDesignPreviewInput; stageId: string; explicitlyStated: boolean };
          if (args.explicitlyStated !== true) throw new Error("Ask the founder to confirm the packaging direction before staging it.");
          const current = await workspaceApi(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          const staged = await callbacksRef.current.onPreviewPackageDesign(args.packageDesign, current.workspace, args.stageId, "agent");
          return withGuidance(staged, { preview: staged.preview, previewOpened: true, committed: false, humanActionRequired: "The founder must review the persisted live 3D refinement and click Use this package direction to commit that exact version." });
        },
      },
      {
        name: "undo_last_agent_change",
        title: "Undo latest agent change",
        description: "Undo the latest visible agent-authored workspace change only after the founder asks to undo or reject it.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          void input;
          const current = await workspaceApi(`/api/sourcing/${workspaceId}`);
          if (!current.workspace?.lastAgentChange) throw new Error("There is no current agent change to undo.");
          return withGuidance(await workspaceApi(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ revision: current.workspace.revision, undoAgentChangeId: current.workspace.lastAgentChange.id }) }));
        },
      },
      {
        name: "export_product_packet",
        title: "Export founder product plan PDF",
        description: "Prepare the authenticated download URL for the founder's current product-plan PDF. This exports the brief, open decisions, packaging direction, and sourced manufacturer possibilities. It does not share or send the PDF to anyone.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await workspaceApi(`/api/sourcing/${workspaceId}`);
          if (!body.workspace) throw new Error("The current ProductPlan could not be read.");
          return withGuidance(body, { downloadUrl: new URL(`/api/sourcing/${workspaceId}/export`, window.location.origin).toString(), fileType: "application/pdf", sharedExternally: false });
        },
      },
      {
        name: "audit_outreach_readiness",
        title: "Audit introduction readiness",
        description: "Read the current manufacturer-introduction gates without changing the workspace. Return whether research is current, the founder shortlist is present, the manufacturer brief and saved 3D package direction are ready, recipient-specific drafts are current, and which founder-only approvals remain. This tool never selects a manufacturer, prepares or approves a draft, or sends anything.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await workspaceApi(`/api/sourcing/${workspaceId}`);
          if (!body.workspace) throw new Error("The current ProductPlan could not be read.");
          return buildOutreachReadinessAudit(body.workspace);
        },
      },
      {
        name: "match_manufacturers",
        title: "Match manufacturers with evidence",
        description: "Research a small set of manufacturers once the plan is ready to research, even if some decisions are still open. Return supported facts, possible conflicts, unknowns, source URLs, and review dates. Use requiredRequirements only for founder-confirmed must-haves; missing public proof may produce zero strict results. Unsupported geography is clarified before any search or workspace mutation. When a strict search returns no results, explain it and direct the founder to the visible Review broader search control; the agent cannot silently retry weaker criteria. This tool closes any staged 3D workbench before revealing the manufacturer view. It never selects a manufacturer or creates outreach drafts.",
        inputSchema: {
          type: "object",
          properties: {
            geographyPreference: { type: "string" },
            resultLimit: { type: "integer", minimum: 1, maximum: 3, default: 3 },
            requiredRequirements: { type: "array", items: { type: "string", enum: matchableRequirementKeys }, maxItems: matchableRequirementKeys.length },
            preferredRequirements: { type: "array", items: { type: "string", enum: matchableRequirementKeys }, maxItems: matchableRequirementKeys.length },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as Record<string, unknown>;
          const geographyPreflight = getGeographyMatchPreflight(args.geographyPreference);
          if (geographyPreflight) return geographyPreflight;

          const body = await workspaceApi(`/api/sourcing/${workspaceId}/match`, { method: "POST", body: JSON.stringify(args) });
          const resultCount = body.workspace?.matches.length ?? 0;
          const requiredRequirements = Array.isArray(args.requiredRequirements)
            ? args.requiredRequirements.filter((value): value is string => typeof value === "string")
            : [];
          const result = withGuidance(body, {
            resultsShown: true,
            resultCount,
            navigation: {
              target: `/sourcing/${workspaceId}/manufacturers`,
              deferredUntilAfterReceipt: true,
              workspaceToolSetStable: true,
              refetchRequired: false,
            },
            matchingGuidance: resultCount === 0 && requiredRequirements.length
              ? {
                  strictSearchReturnedNoResults: true,
                  instruction: "No candidate publicly proved every founder-required capability. Explain that result without weakening the must-haves. The founder can open Review broader search, inspect the exact before/after criteria, and confirm or cancel. Do not submit the suggested retry directly.",
                  suggestedRetry: {
                    ...args,
                    requiredRequirements: [],
                    preferredRequirements: [...new Set([
                      ...(Array.isArray(args.preferredRequirements) ? args.preferredRequirements.filter((value): value is string => typeof value === "string") : []),
                      ...requiredRequirements,
                    ])],
                  },
                  founderConfirmationSurface: "Review broader search",
                  directAgentRetryAllowed: false,
                }
              : { strictSearchReturnedNoResults: false },
          });
          deferToolNavigation(() => callbacksRef.current.onOpenManufacturerMatches());
          return result;
        },
      },
      {
        name: "prepare_manufacturer_outreach",
        title: "Prepare manufacturer outreach",
        description: "Complete the agent's final autonomous step: create manufacturer-specific introduction drafts only for the exact manufacturers the founder selected in the visible workspace and only after readiness.manufacturerReady is true, then open the exact-message review. A visibly reviewed, founder-saved 3D package direction is part of readiness. founderInstructions are private drafting guidance and are never copied verbatim into recipient text. This prepares drafts only. The founder must review and approve each exact version, then separately confirm Send now; WebMCP cannot send.",
        inputSchema: {
          type: "object",
          properties: {
            selectedManufacturerIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
            founderInstructions: { type: "string" },
            proposedSharedFields: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: fieldKeys.length },
          },
          required: ["selectedManufacturerIds"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as Record<string, unknown>;
          const body = await workspaceApi(`/api/sourcing/${workspaceId}/outreach`, { method: "POST", body: JSON.stringify(args) });
          const result = withGuidance(body, {
            reviewOpened: true,
            navigation: {
              target: `/sourcing/${workspaceId}/manufacturers#manufacturer-introductions`,
              deferredUntilAfterReceipt: true,
              workspaceToolSetStable: true,
              refetchRequired: false,
            },
            humanActionRequired: "The introduction drafts are ready. The founder must review and approve each exact version, then separately click Send introduction and confirm Send now. Nothing has been sent.",
          });
          deferToolNavigation(() => callbacksRef.current.onOpenIntroductionReview());
          return result;
        },
      },
      {
        name: "open_manufacturer_introduction_review",
        title: "Open founder introduction review",
        description: "Open the current page's introduction review so the founder can inspect every sourced recipient, exact message, shared product details, and private fields. This tool never sends or contacts anyone. The founder must approve the exact version, then separately confirm Send now in the visible page to deliver it through The Line List.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await workspaceApi(`/api/sourcing/${workspaceId}`);
          const research = body.workspace?.manufacturerResearch;
          const currentDraftAvailable = body.workspace?.outreachDrafts.some((draft) =>
            draft.packet.revokedAt === null
            && body.workspace?.selectedManufacturerSlugs.includes(draft.manufacturerSlug)
            && research?.status === "current"
            && research.candidates.some((match) => match.manufacturerSlug === draft.manufacturerSlug)
            && Date.parse(draft.createdAt) >= Date.parse(research.ranAt)
          );
          if (!currentDraftAvailable) throw new Error("Prepare a current introduction draft before opening final review.");
          const result = withGuidance(body, {
            reviewOpened: true,
            navigation: {
              target: `/sourcing/${workspaceId}/manufacturers#manufacturer-introductions`,
              deferredUntilAfterReceipt: true,
              workspaceToolSetStable: true,
              refetchRequired: false,
            },
            humanActionRequired: "The founder must approve each exact draft and then click the visible Send now control. Nothing can be sent by this tool.",
          });
          deferToolNavigation(() => callbacksRef.current.onOpenIntroductionReview());
          return result;
        },
      },
    ];

    void Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))).catch((error) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      console.warn("[webmcp] sourcing tools unavailable", error);
    });
    return () => controller.abort();
  }, [workspaceId]);

  return null;
}

function deferToolNavigation(navigate: () => void) {
  window.setTimeout(navigate, 250);
}

function decodeBase64Artwork(value: string): Uint8Array {
  const encoded = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  let decoded: string;
  try {
    decoded = window.atob(encoded.replace(/\s/g, ""));
  } catch {
    throw new Error("Artwork is not valid base64 data.");
  }
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

async function renderPackageArtwork({
  brand,
  product,
  category,
  artDirection,
  style,
  accentColor,
}: {
  brand: string;
  product: string;
  category: ProductCategory;
  artDirection: string;
  style: PackageArtworkStyle;
  accentColor?: string;
}): Promise<{ blob: Blob; aspect: number; motifs: PackageArtworkMotif[]; visualSignature: string }> {
  const width = 1000;
  const height = Math.round(width / PACKAGE_ARTWORK_ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Package artwork could not be rendered in this browser.");
  const palettes: Record<PackageArtworkStyle, { paper: string; ink: string; accent: string; quiet: string }> = {
    "warm-handmade": { paper: "#f5ead8", ink: "#173f35", accent: "#c65a32", quiet: "#d9b979" },
    "modern-premium": { paper: "#f3eee4", ink: "#0b2f29", accent: "#b78b3e", quiet: "#d8d1c4" },
    "playful-retail": { paper: "#fff2dc", ink: "#123f3a", accent: "#e65d3f", quiet: "#86c7b8" },
  };
  const categoryColors: Record<ProductCategory, { accent: string; quiet: string }> = {
    bakery: { accent: "#c95f35", quiet: "#e2bc78" },
    beverage: { accent: "#177a72", quiet: "#8ccbc0" },
    food: { accent: "#b95332", quiet: "#d7bf85" },
    frozen: { accent: "#315e83", quiet: "#a8cbd6" },
    sauce: { accent: "#d7472f", quiet: "#efaa66" },
    snack: { accent: "#c96b2e", quiet: "#e3c357" },
  };
  const palette = { ...palettes[style], ...categoryColors[category], ...(accentColor ? { accent: accentColor } : {}) };
  const plan = getPackageArtworkRenderPlan({ brand, product, artDirection, style, category, accentColor });
  context.clearRect(0, 0, width, height);
  roundedRect(context, 28, 28, width - 56, height - 56, 42);
  context.fillStyle = palette.paper;
  context.fill();
  context.lineWidth = style === "modern-premium" ? 8 : 14;
  context.strokeStyle = palette.ink;
  context.stroke();

  if (style === "warm-handmade") drawHandmadeRays(context, width, height, palette.quiet);
  if (style === "modern-premium") drawPremiumFrame(context, width, height, palette.accent);
  if (style === "playful-retail") drawRetailDots(context, width, height, palette.quiet, palette.accent);

  context.fillStyle = palette.ink;
  context.fillRect(28, 28, width - 56, 108);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = palette.paper;
  context.font = "800 22px Arial, sans-serif";
  context.fillText(`${plan.category.toUpperCase()}  •  ${plan.kicker}`, width / 2, 82);
  context.fillStyle = palette.ink;
  fitText(context, plan.brand, width - 150, style === "playful-retail" ? 132 : 144, style === "modern-premium" ? "Georgia, serif" : "Arial, sans-serif", 800);
  context.fillText(plan.brand, width / 2, 300);
  context.fillStyle = palette.accent;
  drawFittedMultilineText(context, plan.product, width / 2, 470, width - 180, 88, "Georgia, serif", 700);
  context.fillStyle = palette.ink;
  context.font = "800 20px Arial, sans-serif";
  context.fillText(plan.motifs.map(({ motif }) => motifLabel(motif)).join("  •  "), width / 2, 615);
  context.save();
  context.globalAlpha = style === "modern-premium" ? 0.08 : 0.14;
  context.fillStyle = palette.quiet;
  context.beginPath();
  context.ellipse(width / 2, height * 0.69, 330, 155, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
  drawArtworkMotifs(context, plan.motifs, width, height, palette.accent, palette.quiet);
  context.fillStyle = palette.ink;
  roundedRect(context, 90, height - 190, width - 180, 92, 24);
  context.fill();
  context.fillStyle = palette.paper;
  context.font = "700 23px Arial, sans-serif";
  context.fillText(plan.footer, width / 2, height - 144);
  context.fillStyle = palette.accent;
  context.fillRect(width / 2 - 110, height - 76, 220, 8);

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Package artwork could not be encoded.")), "image/png"));
  return {
    blob,
    aspect: width / height,
    motifs: plan.motifs.map(({ motif }) => motif),
    visualSignature: `sha256:${await sha256Hex(await blob.arrayBuffer())}`,
  };
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fitText(context: CanvasRenderingContext2D, text: string, maximumWidth: number, startingSize: number, family: string, weight: number) {
  let size = startingSize;
  do {
    context.font = `${weight} ${size}px ${family}`;
    size -= 2;
  } while (context.measureText(text).width > maximumWidth && size > 34);
}

function drawFittedMultilineText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maximumWidth: number,
  startingSize: number,
  family: string,
  weight: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  let size = startingSize;
  let lines: string[] = [text];
  do {
    context.font = `${weight} ${size}px ${family}`;
    lines = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && context.measureText(next).width > maximumWidth) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    if (lines.length <= 2 && lines.every((line) => context.measureText(line).width <= maximumWidth)) break;
    size -= 2;
  } while (size > 42);

  const lineHeight = size * 1.02;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 2).forEach((line, index) => context.fillText(line, x, startY + index * lineHeight));
}

function drawHandmadeRays(context: CanvasRenderingContext2D, width: number, height: number, color: string) {
  context.save();
  context.globalAlpha = 0.28;
  context.strokeStyle = color;
  context.lineWidth = 6;
  for (let index = 0; index < 18; index += 1) {
    const angle = (Math.PI * 2 * index) / 18;
    context.beginPath();
    context.moveTo(width / 2 + Math.cos(angle) * 250, height / 2 + Math.sin(angle) * 190);
    context.lineTo(width / 2 + Math.cos(angle) * 560, height / 2 + Math.sin(angle) * 390);
    context.stroke();
  }
  context.restore();
}

function drawPremiumFrame(context: CanvasRenderingContext2D, width: number, height: number, color: string) {
  context.strokeStyle = color;
  context.lineWidth = 3;
  roundedRect(context, 62, 62, width - 124, height - 124, 28);
  context.stroke();
}

function drawRetailDots(context: CanvasRenderingContext2D, width: number, height: number, quiet: string, accent: string) {
  context.save();
  for (let index = 0; index < 22; index += 1) {
    const x = 80 + ((index * 173) % (width - 160));
    const y = 80 + ((index * 97) % (height - 160));
    context.beginPath();
    context.arc(x, y, index % 3 === 0 ? 16 : 9, 0, Math.PI * 2);
    context.fillStyle = index % 2 === 0 ? quiet : accent;
    context.globalAlpha = 0.24;
    context.fill();
  }
  context.restore();
}

function drawArtworkMotifs(
  context: CanvasRenderingContext2D,
  motifs: PackageArtworkMotifRenderPlan[],
  width: number,
  height: number,
  accent: string,
  quiet: string,
) {
  motifs.forEach((motif) => drawArtworkMotif(
    context,
    motif.motif,
    motif.x * width,
    motif.y * height,
    accent,
    quiet,
    motif.scale,
    motif.rotation,
    motif.arrangement,
  ));
}

function drawArtworkMotif(context: CanvasRenderingContext2D, motif: PackageArtworkMotif, x: number, y: number, accent: string, quiet: string, scale: number, rotation: number, arrangement: PackageArtworkMotifRenderPlan["arrangement"]) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = accent;
  context.fillStyle = quiet;
  context.lineWidth = 8;
  context.globalAlpha = 0.86;

  if (motif === "bubbles") {
    const bubbles = arrangement === "around"
      ? Array.from({ length: 8 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 8;
          return [Math.cos(angle) * 82, Math.sin(angle) * 72, index % 2 === 0 ? 13 : 9] as const;
        })
      : [[0, 0, 24], [45, -28, 15], [48, 28, 11]] as const;
    bubbles.forEach(([dx, dy, radius]) => {
      context.beginPath();
      context.arc(dx, dy, radius, 0, Math.PI * 2);
      context.stroke();
    });
  } else if (motif === "berry") {
    [[0, 10, 30], [-34, -14, 24], [34, -14, 24]].forEach(([dx, dy, radius]) => {
      context.beginPath();
      context.arc(dx, dy, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
    context.beginPath();
    context.ellipse(-13, -48, 11, 25, -0.7, 0, Math.PI * 2);
    context.ellipse(13, -48, 11, 25, 0.7, 0, Math.PI * 2);
    context.fillStyle = accent;
    context.fill();
  } else if (motif === "chickpea") {
    [-38, 0, 38].forEach((dx, index) => {
      context.beginPath();
      context.moveTo(dx - 24, index === 1 ? -8 : -22);
      context.bezierCurveTo(dx - 28, -46, dx + 30, -44, dx + 25, -3);
      context.bezierCurveTo(dx + 20, 35, dx - 25, 39, dx - 24, index === 1 ? -8 : -22);
      context.fill();
      context.stroke();
      context.beginPath();
      context.arc(dx + 4, -7, 5, 0, Math.PI * 2);
      context.fillStyle = accent;
      context.fill();
      context.fillStyle = quiet;
    });
  } else if (motif === "drop") {
    context.beginPath();
    context.moveTo(0, -48);
    context.bezierCurveTo(34, -12, 38, 16, 0, 48);
    context.bezierCurveTo(-38, 16, -34, -12, 0, -48);
    context.fill();
  } else if (motif === "honey") {
    [[-34, 0], [34, 0], [0, -54]].forEach(([dx, dy]) => {
      context.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = Math.PI / 6 + (Math.PI * index) / 3;
        const point = [dx + Math.cos(angle) * 32, dy + Math.sin(angle) * 32] as const;
        if (index === 0) context.moveTo(...point);
        else context.lineTo(...point);
      }
      context.closePath();
      context.stroke();
      if (dx === 34) context.fill();
    });
  } else if (motif === "chili") {
    context.beginPath();
    context.moveTo(-52, -8);
    context.bezierCurveTo(-14, 44, 42, 34, 58, -26);
    context.bezierCurveTo(18, -4, -18, -30, -52, -8);
    context.fill();
    context.beginPath();
    context.moveTo(52, -24);
    context.quadraticCurveTo(60, -50, 76, -54);
    context.stroke();
  } else if (motif === "citrus") {
    context.beginPath();
    context.arc(0, 0, 47, 0, Math.PI * 2);
    context.stroke();
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(Math.cos(angle) * 42, Math.sin(angle) * 42);
      context.stroke();
    }
  } else if (motif === "coffee") {
    context.beginPath();
    context.ellipse(0, 0, 34, 49, 0.5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = accent;
    context.beginPath();
    context.moveTo(-8, -39);
    context.bezierCurveTo(14, -18, -14, 18, 8, 39);
    context.stroke();
  } else if (motif === "lightning") {
    context.beginPath();
    context.moveTo(14, -58);
    context.lineTo(-30, 2);
    context.lineTo(-2, 2);
    context.lineTo(-20, 58);
    context.lineTo(38, -14);
    context.lineTo(8, -14);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (motif === "star") {
    context.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? 52 : 22;
      const angle = -Math.PI / 2 + (Math.PI * index) / 5;
      const point = [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
      if (index === 0) context.moveTo(...point);
      else context.lineTo(...point);
    }
    context.closePath();
    context.fill();
    context.stroke();
  } else if (motif === "sunburst") {
    context.beginPath();
    context.arc(0, 0, 24, 0, Math.PI * 2);
    context.fill();
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      context.beginPath();
      context.moveTo(Math.cos(angle) * 34, Math.sin(angle) * 34);
      context.lineTo(Math.cos(angle) * 62, Math.sin(angle) * 62);
      context.stroke();
    }
  } else if (motif === "wave") {
    for (let row = -1; row <= 1; row += 1) {
      context.beginPath();
      context.moveTo(-62, row * 24);
      context.bezierCurveTo(-32, row * 24 - 30, -8, row * 24 + 30, 22, row * 24);
      context.bezierCurveTo(40, row * 24 - 18, 52, row * 24 - 18, 64, row * 24);
      context.stroke();
    }
  } else {
    const isGrain = motif === "grain";
    context.beginPath();
    context.moveTo(0, 52);
    context.quadraticCurveTo(isGrain ? -4 : 18, 2, 0, -52);
    context.stroke();
    for (let index = -2; index <= 2; index += 1) {
      context.beginPath();
      context.ellipse(index % 2 === 0 ? -18 : 18, index * 18, 12, 24, index % 2 === 0 ? -0.7 : 0.7, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function motifLabel(motif: PackageArtworkMotif): string {
  return ({
    berry: "BERRY",
    bubbles: "BUBBLES",
    chickpea: "CHICKPEA",
    chili: "CHILI",
    citrus: "CITRUS",
    coffee: "COFFEE",
    drop: "BOLD POUR",
    grain: "GRAIN MOTIF",
    honey: "HONEY",
    leaf: "PLANT INSPIRED",
    lightning: "LIGHTNING",
    star: "STAR",
    sunburst: "SUNBURST",
    wave: "WAVES",
  } satisfies Record<PackageArtworkMotif, string>)[motif];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
}
