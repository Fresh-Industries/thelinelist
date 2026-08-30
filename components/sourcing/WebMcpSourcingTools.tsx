"use client";

import { useEffect, useRef } from "react";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import { getBrandName, getPackagingOptions, getProductCategory, getProductDescriptor, getProductName } from "@/lib/sourcing/product-catalog";
import { getProductJourney } from "@/lib/sourcing/product-journey";
import { getCategoryDecisionGuardrails, getSourcingQuestion } from "@/lib/sourcing/questions";
import { SOURCING_FIELD_KEYS, type PackageDesignPreviewInput, type SourcingWorkspace } from "@/lib/sourcing/types";

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
  onOpenIntroductionReview,
  onPreviewPackageDesign,
}: {
  workspaceId: string;
  onWorkspaceChanged: (workspace: SourcingWorkspace) => void;
  onOpenIntroductionReview: () => void;
  onPreviewPackageDesign: (preview: PackageDesignPreviewInput, workspace?: SourcingWorkspace) => void;
}) {
  const callbacksRef = useRef({ onWorkspaceChanged, onOpenIntroductionReview, onPreviewPackageDesign });
  useEffect(() => {
    callbacksRef.current = { onWorkspaceChanged, onOpenIntroductionReview, onPreviewPackageDesign };
  }, [onOpenIntroductionReview, onPreviewPackageDesign, onWorkspaceChanged]);

  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const fieldKeys = [...SOURCING_FIELD_KEYS];
    const withGuidance = (body: ToolResponse) => {
      if (body.workspace) callbacksRef.current.onWorkspaceChanged(body.workspace);
      if (!body.workspace) return body;
      const { workspace, ...response } = body;
      const readiness = getSourcingReadiness(workspace);
      return {
        ...response,
        workspace: compactWorkspace(workspace),
        readiness,
        nextQuestion: readiness.nextQuestionKey ? getSourcingQuestion(workspace, readiness.nextQuestionKey) : null,
        decisionGuardrails: getCategoryDecisionGuardrails(workspace),
        product: {
          name: getProductName(workspace),
          brandName: getBrandName(workspace),
          descriptor: getProductDescriptor(workspace),
          category: getProductCategory(workspace),
          artwork: workspace.artwork,
        },
        journey: getProductJourney(workspace),
        relevantPackagingOptions: getPackagingOptions(workspace).map(({ id, label, value, description }) => ({ id, label, value, description })),
        whatChanged: workspace.activity[0]?.message ?? null,
        externalContactRequiresFounderAction: true,
      };
    };

    const tools: WebMcpToolDefinition[] = [
      {
        name: "get_sourcing_workspace",
        title: "Read sourcing workspace",
        description: "Read the canonical ProductPlan on the current page. Treat originalIdea as source context, brand_name as the founder's brand identity, and product_type as the concise product being manufactured. Use readiness.nextQuestionKey to drive one useful question at a time. A saved 3D package direction is required for manufacturer-ready status; when readiness.packageDesignReady is false and packaging is the next decision, open the visible refinement workbench instead of describing changes invisibly. If brand_name is open, ask whether the founder already has a brand; no or not yet is valid and does not block manufacturing progress. Preserve confirmed founder decisions, keep uncertainty explicit, and never ask for a workspace ID.",
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
        description: "Update the canonical ProductPlan from the conversation. Keep originalIdea, brand_name, and product_type distinct. For no brand, not yet, or uncertainty, write brand_name as null with needs_decision and continue; never invent a brand. When enough confirmed facts exist and product_description is open, write a concise proposed product description using only those facts, clearly preserving unresolved validation. Mark a value confirmed only when the founder stated it clearly. Research-backed recommendations remain proposed with sources. Never make a visual packaging change through a text field alone: use preview_package_design or refine_package_design_in_3d so the founder sees the work live. After updating, read readiness and ask its single next useful question. The page visibly highlights proposals, lets the founder accept them, and lets the founder undo the latest agent change.",
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
        description: "Read the current packaging direction, artwork state, and valid package options. Use this before proposing a visual packaging change. A 3D preview is available on the page for founder judgment.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await api(`/api/sourcing/${workspaceId}`);
          return withGuidance({ ...body, packageDesign: body.workspace?.packageDesign ?? null, packagingOptions: body.workspace ? getPackagingOptions(body.workspace) : [] });
        },
      },
      {
        name: "preview_package_design",
        title: "Preview packaging in 3D",
        description: "Stage any subset of packaging choices in the visible 3D workbench for founder review. Use this for exploration and agent-generated directions. Omit choices the founder has not made instead of inventing them. This does not commit the package direction, clear manufacturer matches, or change the canonical ProductPlan; only the founder's visible Use this package direction button can do that.",
        inputSchema: {
          type: "object",
          properties: {
            packagingType: { type: "string", enum: ["slim-can", "bottle", "jar", "stand-up-pouch"] },
            finish: { type: "string", enum: ["colored", "clear"] },
            baseColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            labelColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            artworkId: { type: ["string", "null"] },
            logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
            logoScale: { type: "number", minimum: 0.05, maximum: 3 },
            logoPosition: { type: "object", properties: { x: { type: "number", minimum: -2, maximum: 2 }, y: { type: "number", minimum: -2, maximum: 2 } }, additionalProperties: false },
            dimensions: { type: "object", properties: { width: { type: ["number", "null"], minimum: 0, maximum: 10000 }, height: { type: ["number", "null"], minimum: 0, maximum: 10000 }, depth: { type: ["number", "null"], minimum: 0, maximum: 10000 } }, additionalProperties: false },
            summary: { type: "string", maxLength: 500 },
          },
          minProperties: 1,
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const preview = input as PackageDesignPreviewInput;
          callbacksRef.current.onPreviewPackageDesign(preview);
          return { previewOpened: true, committed: false, preview, humanActionRequired: "The founder must review the staged 3D direction and click Use this package direction to commit it." };
        },
      },
      {
        name: "stage_package_artwork",
        title: "Stage generated package artwork",
        description: "Upload founder-requested generated logo or label artwork into this product workspace and open it on the visible 3D packaging preview. Accept PNG, JPEG, or WebP bytes encoded as base64, up to 2 MB. The upload becomes a workspace asset, but it does not commit a packaging direction or affect matching until the founder uses the visible package direction.",
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
          callbacksRef.current.onPreviewPackageDesign(preview, body.workspace);
          return withGuidance({ ...body, artworkUrl: body.artworkUrl, previewOpened: true, committed: false, humanActionRequired: "The founder must visually review the artwork and click Use this package direction to commit it." });
        },
      },
      {
        name: "refine_package_design_in_3d",
        title: "Refine packaging direction in 3D",
        description: "Open a complete founder-requested packaging direction in the visible 3D workbench. Do not invent colors, finish, dimensions, artwork, or logo placement. This always stages the direction for visual review; it never commits behind the scenes. Only the founder's visible Use this package direction button can make it canonical and satisfy package-design readiness.",
        inputSchema: {
          type: "object",
          properties: {
            packageDesign: {
              type: "object",
              properties: {
                packagingType: { type: "string", enum: ["slim-can", "bottle", "jar", "stand-up-pouch"] },
                finish: { type: "string", enum: ["colored", "clear"] },
                baseColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                labelColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                artworkId: { type: ["string", "null"] },
                logoAspect: { type: "number", minimum: 0.25, maximum: 4 },
                logoScale: { type: "number", minimum: 0.05, maximum: 3 },
                logoPosition: { type: "object", properties: { x: { type: "number", minimum: -2, maximum: 2 }, y: { type: "number", minimum: -2, maximum: 2 } }, required: ["x", "y"], additionalProperties: false },
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
          callbacksRef.current.onPreviewPackageDesign(args.packageDesign, current.workspace);
          return withGuidance({ ...current, previewOpened: true, committed: false, humanActionRequired: "The founder must review the live 3D refinement and click Use this package direction to commit it." });
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
          return withGuidance({ ...body, downloadUrl: new URL(`/api/sourcing/${workspaceId}/export`, window.location.origin).toString(), fileType: "application/pdf", sharedExternally: false });
        },
      },
      {
        name: "match_manufacturers",
        title: "Match manufacturers with evidence",
        description: "Research a small set of manufacturers once the plan is ready to research, even if some decisions are still open. Return supported facts, possible conflicts, unknowns, source URLs, and review dates. This tool never selects a manufacturer or creates outreach drafts.",
        inputSchema: {
          type: "object",
          properties: {
            geographyPreference: { type: "string" },
            resultLimit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
            requiredRequirements: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: 15 },
            preferredRequirements: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: 15 },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = input as Record<string, unknown>;
          const body = await api(`/api/sourcing/${workspaceId}/match`, { method: "POST", body: JSON.stringify(args) });
          return withGuidance(body);
        },
      },
      {
        name: "prepare_manufacturer_outreach",
        title: "Prepare manufacturer outreach",
        description: "Create manufacturer-specific introduction drafts only for the exact manufacturers the founder already selected in the visible workspace and only after readiness.manufacturerReady is true. A visibly reviewed, founder-saved 3D package direction is part of that readiness. founderInstructions are private drafting guidance and are never copied verbatim into recipient text. This creates draft state only and never sends or contacts anyone.",
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
          return withGuidance(body);
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
          if (!body.workspace?.outreachDrafts.length) throw new Error("Prepare an introduction draft before opening final review.");
          callbacksRef.current.onOpenIntroductionReview();
          return withGuidance({ ...body, reviewOpened: true, humanActionRequired: "The founder must approve each exact draft and then click the visible Send now control. Nothing can be sent by this tool." });
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

function compactWorkspace(workspace: SourcingWorkspace) {
  return {
    id: workspace.id,
    revision: workspace.revision,
    originalIdea: workspace.originalIdea,
    fields: workspace.fields,
    artwork: workspace.artwork,
    packageDesign: workspace.packageDesign,
    lastAgentChange: workspace.lastAgentChange,
    matchesUpdatedAt: workspace.matchesUpdatedAt,
    matches: workspace.matches.map((match) => ({
      manufacturerSlug: match.manufacturerSlug,
      manufacturerName: match.manufacturerName,
      location: match.location,
      fitExplanation: match.fitExplanation,
      supportedMatches: match.supportedMatches,
      possibleConflicts: match.possibleConflicts,
      unknowns: match.unknowns,
      introductionAvailable: match.introductionAvailable,
      lastReviewed: match.lastReviewed,
    })),
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs,
    outreachDrafts: workspace.outreachDrafts.map((draft) => ({
      id: draft.id,
      manufacturerSlug: draft.manufacturerSlug,
      manufacturerName: draft.manufacturerName,
      subject: draft.subject,
      warnings: draft.warnings,
      version: draft.version,
      approvedVersion: draft.approvedVersion,
      deliveryStatus: draft.deliveryStatus,
      updatedAt: draft.updatedAt,
    })),
  };
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
