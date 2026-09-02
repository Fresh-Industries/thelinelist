"use client";

import { useEffect, useRef } from "react";
import { buildSourcingAgentState } from "@/lib/sourcing/agent-state";
import { getGeographyMatchPreflight } from "@/lib/sourcing/geography";
import { MATCHABLE_REQUIREMENT_KEYS } from "@/lib/sourcing/matching-requirements";
import { getPackageArtworkConcept, PACKAGE_ARTWORK_ASPECT, type PackageArtworkMotif, type PackageArtworkStyle } from "@/lib/sourcing/package-artwork";
import { SOURCING_FIELD_KEYS, type PackageDesignPreviewInput, type SourcingWorkspace } from "@/lib/sourcing/types";
import { packageConfigs, type PackagingType } from "@/components/product-visuals/package-config";

interface ToolResponse { workspace?: SourcingWorkspace; error?: string; [key: string]: unknown }

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
  onPreviewPackageDesign: (preview: PackageDesignPreviewInput, workspace?: SourcingWorkspace) => SourcingWorkspace["packageDesign"] & {};
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
    const withGuidance = (body: ToolResponse, metadata: Record<string, unknown> = {}) => {
      if (body.workspace) callbacksRef.current.onWorkspaceChanged(body.workspace);
      if (!body.workspace) return body.error ? { error: body.error, ...metadata } : metadata;
      return {
        ...buildSourcingAgentState(body.workspace),
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
          return withGuidance(await api(`/api/sourcing/${workspaceId}`));
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
          const current = await api(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          const body = await api(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ revision: current.workspace.revision, proposedUpdates: args.proposedUpdates }) });
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
          const body = await api(`/api/sourcing/${workspaceId}`);
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
        description: "Stage any subset of packaging choices in the visible 3D workbench for founder review. Use bakery-bag with frontText and windowScale for bread instead of substituting a generic pouch. Exact copy is rendered deterministically, and logoPosition.y moves the front copy vertically. Omit choices the founder has not made. This does not commit or change matching; only the founder's visible Use this package direction button can commit it.",
        inputSchema: {
          type: "object",
          properties: {
            packagingType: { type: "string", enum: ["slim-can", "bottle", "jar", "stand-up-pouch", "bakery-bag"] },
            finish: { type: "string", enum: ["colored", "clear"] },
            baseColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            labelColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            artworkId: { type: ["string", "null"] },
            logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
            logoScale: { type: "number", minimum: 0.05, maximum: 3 },
            logoPosition: { type: "object", properties: { x: { type: "number", minimum: -2, maximum: 2 }, y: { type: "number", minimum: -2, maximum: 2 } }, additionalProperties: false },
            frontText: { type: "object", properties: { brand: { type: "string", maxLength: 120 }, product: { type: "string", maxLength: 160 } }, required: ["brand", "product"], additionalProperties: false },
            windowScale: { type: "number", minimum: 0.35, maximum: 1 },
            dimensions: { type: "object", properties: { width: { type: ["number", "null"], minimum: 0, maximum: 10000 }, height: { type: ["number", "null"], minimum: 0, maximum: 10000 }, depth: { type: ["number", "null"], minimum: 0, maximum: 10000 } }, additionalProperties: false },
            summary: { type: "string", maxLength: 500 },
          },
          minProperties: 1,
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const preview = input as PackageDesignPreviewInput;
          const stagedPreview = callbacksRef.current.onPreviewPackageDesign(preview);
          return { previewOpened: true, committed: false, preview: stagedPreview, humanActionRequired: "The founder must review the staged 3D direction and click Use this package direction to commit it." };
        },
      },
      {
        name: "stage_package_artwork",
        title: "Stage generated package artwork",
        description: "Complete the creative handoff by uploading founder-requested generated logo or label artwork and opening it on the visible 3D package. Before using this tool, read creative.nextQuestion and ask the founder one simple question if a brand name or art direction is still missing; never invent either. Generate the requested raster artwork with the host image generator, then pass PNG, JPEG, or WebP bytes encoded as base64, up to 2 MB. The upload becomes a workspace asset, but it does not commit a packaging direction or affect matching until the founder uses the visible package direction.",
        inputSchema: {
          type: "object",
          properties: {
            fileName: { type: "string", minLength: 1, maxLength: 140 },
            contentType: { type: "string", enum: ["image/png", "image/jpeg", "image/webp"] },
            base64Data: { type: "string", minLength: 4, maxLength: 2800000 },
            logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
          },
          required: ["fileName", "contentType", "base64Data"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as { fileName: string; contentType: "image/png" | "image/jpeg" | "image/webp"; base64Data: string; logoAspect?: number };
          const bytes = decodeBase64Artwork(args.base64Data);
          if (bytes.byteLength > 2 * 1024 * 1024) throw new Error("Artwork must be 2 MB or smaller.");
          const form = new FormData();
          form.set("artwork", new File([bytes.buffer as ArrayBuffer], args.fileName, { type: args.contentType }));
          const response = await fetch(`/api/sourcing/${workspaceId}/artwork`, { method: "POST", body: form, cache: "no-store" });
          const body = await response.json().catch(() => ({})) as ToolResponse & { artworkUrl?: string };
          if (!response.ok || !body.workspace?.artwork) throw new Error(body.error || `Artwork upload failed (${response.status}).`);
          callbacksRef.current.onWorkspaceChanged(body.workspace);
          const preview: PackageDesignPreviewInput = { artworkId: body.workspace.artwork.id, ...(args.logoAspect ? { logoAspect: args.logoAspect } : {}) };
          const stagedPreview = callbacksRef.current.onPreviewPackageDesign(preview, body.workspace);
          return withGuidance(body, { artworkUrl: body.artworkUrl, preview: stagedPreview, previewOpened: true, committed: false, humanActionRequired: "The founder must visually review the artwork and click Use this package direction to commit it." });
        },
      },
      {
        name: "generate_package_artwork",
        title: "Create and stage package artwork",
        description: "Create a polished raster label inside this WebMCP tool from the founder-approved brand and visual direction, upload it to the product workspace, and open it on the visible 3D package. Use this when WebMCP-only operation is required. Ask creative.nextQuestion first, never invent the brand or style, and pass founderApproved true only after the founder explicitly answers. The result is staged for visual review and never commits the package direction.",
        inputSchema: {
          type: "object",
          properties: {
            artDirection: { type: "string", minLength: 3, maxLength: 500 },
            style: { type: "string", enum: ["warm-handmade", "modern-premium", "playful-retail"] },
            accentColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            founderApproved: { type: "boolean", const: true },
          },
          required: ["artDirection", "style", "founderApproved"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as { artDirection: string; style: PackageArtworkStyle; accentColor?: string; founderApproved: boolean };
          if (args.founderApproved !== true) throw new Error("Ask the founder for the package art direction before creating artwork.");
          const current = await api(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          const brand = current.workspace.fields.brand_name.value?.trim();
          if (!brand) throw new Error("Ask what brand name should appear on the package before creating artwork.");
          const product = current.workspace.fields.product_type.value?.trim() || current.workspace.fields.product_name.value?.trim() || "Product";
          const artwork = await renderPackageArtwork({ brand, product, artDirection: args.artDirection, style: args.style, accentColor: args.accentColor });
          const form = new FormData();
          form.set("artwork", new File([artwork.blob], `${slugify(brand)}-${args.style}-label.png`, { type: "image/png" }));
          const response = await fetch(`/api/sourcing/${workspaceId}/artwork`, { method: "POST", body: form, cache: "no-store" });
          const body = await response.json().catch(() => ({})) as ToolResponse & { artworkUrl?: string };
          if (!response.ok || !body.workspace?.artwork) throw new Error(body.error || `Artwork creation failed (${response.status}).`);
          const packagingType = inferArtworkPackagingType(current.workspace);
          const logoConfig = packageConfigs[packagingType].logo;
          const preview = callbacksRef.current.onPreviewPackageDesign({
            artworkId: body.workspace.artwork.id,
            logoAspect: artwork.aspect,
            logoScale: Math.min(logoConfig.defaultScale * 1.2, logoConfig.scale.max),
          }, body.workspace);
          return withGuidance(body, {
            artworkUrl: body.artworkUrl,
            artDirection: args.artDirection,
            artworkStyle: args.style,
            preview,
            previewOpened: true,
            committed: false,
            humanActionRequired: "The founder must visually review the generated artwork on the 3D package and click Use this package direction to commit it.",
          });
        },
      },
      {
        name: "refine_package_design_in_3d",
        title: "Refine packaging direction in 3D",
        description: "Open a complete founder-requested packaging direction in the visible 3D workbench. For bakery-bag, preserve exact frontText, windowScale, and copy placement. Do not invent a brand, colors, dimensions, artwork, or placement. This always stages for visual review; only the founder's visible Use this package direction button can make it canonical.",
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
                frontText: { type: "object", properties: { brand: { type: "string", maxLength: 120 }, product: { type: "string", maxLength: 160 } }, required: ["brand", "product"], additionalProperties: false },
                windowScale: { type: "number", minimum: 0.35, maximum: 1 },
                dimensions: { type: "object", properties: { width: { type: ["number", "null"] }, height: { type: ["number", "null"] }, depth: { type: ["number", "null"] } }, required: ["width", "height", "depth"], additionalProperties: false },
                summary: { type: "string" },
              },
              required: ["packagingType", "finish", "baseColor", "labelColor", "artworkId", "logoAspect", "logoScale", "logoPosition", "dimensions", "summary"],
              additionalProperties: false,
            },
            explicitlyStated: { type: "boolean", const: true },
          },
          required: ["packageDesign", "explicitlyStated"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as { packageDesign: PackageDesignPreviewInput; explicitlyStated: boolean };
          if (args.explicitlyStated !== true) throw new Error("Ask the founder to confirm the packaging direction before staging it.");
          const current = await api(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          const stagedPreview = callbacksRef.current.onPreviewPackageDesign(args.packageDesign, current.workspace);
          return withGuidance(current, { preview: stagedPreview, previewOpened: true, committed: false, humanActionRequired: "The founder must review the live 3D refinement and click Use this package direction to commit it." });
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
          const current = await api(`/api/sourcing/${workspaceId}`);
          if (!current.workspace?.lastAgentChange) throw new Error("There is no current agent change to undo.");
          return withGuidance(await api(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ revision: current.workspace.revision, undoAgentChangeId: current.workspace.lastAgentChange.id }) }));
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
          const body = await api(`/api/sourcing/${workspaceId}`);
          if (!body.workspace) throw new Error("The current ProductPlan could not be read.");
          return withGuidance(body, { downloadUrl: new URL(`/api/sourcing/${workspaceId}/export`, window.location.origin).toString(), fileType: "application/pdf", sharedExternally: false });
        },
      },
      {
        name: "match_manufacturers",
        title: "Match manufacturers with evidence",
        description: "Research a small set of manufacturers once the plan is ready to research, even if some decisions are still open. Return supported facts, possible conflicts, unknowns, source URLs, and review dates. Use requiredRequirements only for founder-confirmed must-haves; missing public proof may produce zero strict results. Unsupported geography is clarified before any search or workspace mutation. When a strict search returns no results, use matchingGuidance to explain the result and ask before retrying those fields as preferences. This tool closes any staged 3D workbench before revealing the manufacturer view. It never selects a manufacturer or creates outreach drafts.",
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

          const body = await api(`/api/sourcing/${workspaceId}/match`, { method: "POST", body: JSON.stringify(args) });
          const resultCount = body.workspace?.matches.length ?? 0;
          const requiredRequirements = Array.isArray(args.requiredRequirements)
            ? args.requiredRequirements.filter((value): value is string => typeof value === "string")
            : [];
          const result = withGuidance(body, {
            resultsShown: true,
            resultCount,
            matchingGuidance: resultCount === 0 && requiredRequirements.length
              ? {
                  strictSearchReturnedNoResults: true,
                  instruction: "No candidate publicly proved every founder-required capability. Explain that result without weakening the must-haves. Ask whether the founder wants to broaden discovery by treating these fields as preferences while keeping missing proof visibly unknown.",
                  suggestedRetry: {
                    ...args,
                    requiredRequirements: [],
                    preferredRequirements: [...new Set([
                      ...(Array.isArray(args.preferredRequirements) ? args.preferredRequirements.filter((value): value is string => typeof value === "string") : []),
                      ...requiredRequirements,
                    ])],
                  },
                }
              : { strictSearchReturnedNoResults: false },
          });
          callbacksRef.current.onOpenManufacturerMatches();
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
          const body = await api(`/api/sourcing/${workspaceId}/outreach`, { method: "POST", body: JSON.stringify(args) });
          const result = withGuidance(body, {
            reviewOpened: true,
            humanActionRequired: "The introduction drafts are ready. The founder must review and approve each exact version, then separately click Send introduction and confirm Send now. Nothing has been sent.",
          });
          callbacksRef.current.onOpenIntroductionReview();
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
          const body = await api(`/api/sourcing/${workspaceId}`);
          const currentDraftAvailable = body.workspace?.outreachDrafts.some((draft) =>
            draft.packet.revokedAt === null
            && body.workspace?.selectedManufacturerSlugs.includes(draft.manufacturerSlug)
            && body.workspace?.matches.some((match) => match.manufacturerSlug === draft.manufacturerSlug)
            && (!body.workspace?.matchesUpdatedAt || Date.parse(draft.createdAt) >= Date.parse(body.workspace.matchesUpdatedAt))
          );
          if (!currentDraftAvailable) throw new Error("Prepare a current introduction draft before opening final review.");
          const result = withGuidance(body, { reviewOpened: true, humanActionRequired: "The founder must approve each exact draft and then click the visible Send now control. Nothing can be sent by this tool." });
          callbacksRef.current.onOpenIntroductionReview();
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
  artDirection,
  style,
  accentColor,
}: {
  brand: string;
  product: string;
  artDirection: string;
  style: PackageArtworkStyle;
  accentColor?: string;
}): Promise<{ blob: Blob; aspect: number }> {
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
  const palette = { ...palettes[style], ...(accentColor ? { accent: accentColor } : {}) };
  const concept = getPackageArtworkConcept({ product, artDirection, style });
  const directionSeed = [...artDirection].reduce((total, character) => total + character.charCodeAt(0), 0);
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

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = palette.accent;
  context.font = "700 26px Arial, sans-serif";
  context.fillText(concept.kicker, width / 2, 145);
  context.fillStyle = palette.ink;
  fitText(context, brand, width - 150, style === "playful-retail" ? 126 : 136, style === "modern-premium" ? "Georgia, serif" : "Arial, sans-serif", 800);
  context.fillText(brand, width / 2, 370);
  context.fillStyle = palette.accent;
  fitText(context, product, width - 190, 70, "Georgia, serif", 700);
  context.fillText(product, width / 2, 535);
  context.fillStyle = palette.ink;
  context.font = "600 24px Arial, sans-serif";
  context.fillText(concept.footer, width / 2, 960);
  drawArtworkMotifs(context, concept.motifs, width, height, palette.accent, palette.quiet);
  context.fillStyle = palette.accent;
  const motifWidth = 160 + (directionSeed % 80);
  context.fillRect(width / 2 - motifWidth / 2, 1060, motifWidth, 8);

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Package artwork could not be encoded.")), "image/png"));
  return { blob, aspect: width / height };
}

function inferArtworkPackagingType(workspace: SourcingWorkspace): PackagingType {
  if (workspace.packageDesign) return workspace.packageDesign.packagingType;
  const packaging = workspace.fields.packaging_format.value?.toLowerCase() ?? "";
  if (/bakery.?bag|bread.?bag|windowed.?bag/.test(packaging)) return "bakery-bag";
  if (/\bcan\b/.test(packaging)) return "slim-can";
  if (/\bbottle\b/.test(packaging)) return "bottle";
  if (/\bjar\b/.test(packaging)) return "jar";
  return "stand-up-pouch";
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
  motifs: PackageArtworkMotif[],
  width: number,
  height: number,
  accent: string,
  quiet: string,
) {
  const positions = [
    { x: 155, y: height * 0.63 },
    { x: width - 155, y: height * 0.63 },
    { x: width / 2, y: height * 0.7 },
  ];
  motifs.forEach((motif, index) => drawArtworkMotif(context, motif, positions[index].x, positions[index].y, accent, quiet));
}

function drawArtworkMotif(context: CanvasRenderingContext2D, motif: PackageArtworkMotif, x: number, y: number, accent: string, quiet: string) {
  context.save();
  context.translate(x, y);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = accent;
  context.fillStyle = quiet;
  context.lineWidth = 8;
  context.globalAlpha = 0.86;

  if (motif === "chickpea" || motif === "berry" || motif === "bubbles") {
    const radii = motif === "bubbles" ? [24, 15, 11] : [30, 24, 18];
    [[0, 0], [45, -28], [48, 28]].forEach(([dx, dy], index) => {
      context.beginPath();
      context.arc(dx, dy, radii[index], 0, Math.PI * 2);
      if (motif === "bubbles") context.stroke();
      else context.fill();
    });
  } else if (motif === "honey" || motif === "drop") {
    context.beginPath();
    context.moveTo(0, -48);
    context.bezierCurveTo(34, -12, 38, 16, 0, 48);
    context.bezierCurveTo(-38, 16, -34, -12, 0, -48);
    context.fill();
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

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
}
