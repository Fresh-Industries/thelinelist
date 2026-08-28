"use client";

import { useEffect } from "react";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import { getBrandName, getPackagingOptions, getProductCategory, getProductDescriptor, getProductName } from "@/lib/sourcing/product-catalog";
import { getProductJourney } from "@/lib/sourcing/product-journey";
import { SOURCING_FIELD_KEYS, type SourcingWorkspace } from "@/lib/sourcing/types";

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
}: {
  workspaceId: string;
  onWorkspaceChanged: (workspace: SourcingWorkspace) => void;
  onOpenIntroductionReview: () => void;
}) {
  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const fieldKeys = [...SOURCING_FIELD_KEYS];
    const withGuidance = (body: ToolResponse) => {
      if (body.workspace) onWorkspaceChanged(body.workspace);
      return body.workspace ? {
        ...body,
        readiness: getSourcingReadiness(body.workspace),
        product: {
          name: getProductName(body.workspace),
          brandName: getBrandName(body.workspace),
          descriptor: getProductDescriptor(body.workspace),
          category: getProductCategory(body.workspace),
          artwork: body.workspace.artwork,
        },
        journey: getProductJourney(body.workspace),
        relevantPackagingOptions: getPackagingOptions(body.workspace).map(({ id, label, value, description }) => ({ id, label, value, description })),
        whatChanged: body.workspace.activity[0]?.message ?? null,
        canonicalPlan: {
          schemaVersion: 2,
          originalIdea: body.workspace.originalIdea,
          fields: body.workspace.fields,
          packageDesign: body.workspace.packageDesign,
          matches: body.workspace.matches,
          selectedManufacturerSlugs: body.workspace.selectedManufacturerSlugs,
          outreachDrafts: body.workspace.outreachDrafts,
        },
        externalContactRequiresFounderAction: true,
      } : body;
    };

    const tools: WebMcpToolDefinition[] = [
      {
        name: "get_sourcing_workspace",
        title: "Read sourcing workspace",
        description: "Read the canonical ProductPlan on the current page. Treat originalIdea as source context, brand_name as the founder's brand identity, and product_type as the concise product being manufactured. Use readiness.nextQuestionKey to drive one useful question at a time. If brand_name is open, ask whether the founder already has a brand; no or not yet is valid and does not block manufacturing progress. Preserve confirmed founder decisions, keep uncertainty explicit, and never ask for a workspace ID.",
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
        description: "Update the canonical ProductPlan from the conversation. Keep originalIdea, brand_name, and product_type distinct. For no brand, not yet, or uncertainty, write brand_name as null with needs_decision and continue; never invent a brand. Mark a value confirmed only when the founder stated it clearly. Research-backed recommendations remain proposed with sources. After updating, read readiness and ask its single next useful question. The page visibly highlights these changes and lets the founder undo them.",
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
        name: "update_package_design",
        title: "Update packaging direction",
        description: "Apply a packaging choice only when the founder explicitly asked for every supplied visual choice. Do not invent colors, finish, dimensions, artwork, or logo placement. For visual exploration or an unstated choice, ask the founder to use the page's packaging workbench instead.",
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
          const args = input as { packageDesign: unknown; explicitlyStated: boolean };
          if (args.explicitlyStated !== true) throw new Error("Ask the founder to confirm the packaging choice before applying it.");
          const current = await api(`/api/sourcing/${workspaceId}`);
          if (!current.workspace) throw new Error("The current ProductPlan could not be read.");
          return withGuidance(await api(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ revision: current.workspace.revision, packageDesign: args.packageDesign, updatedBy: "agent", explicitlyStated: true }) }));
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
        description: "Create manufacturer-specific introduction drafts only for the exact manufacturers the founder already selected in the visible workspace. This creates draft state only and never sends or contacts anyone.",
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
        description: "Open the current page's introduction review so the founder can inspect every recipient, exact message, shared product details, and private fields. This never sends or contacts anyone. Approval and any later human contact are separate states.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await api(`/api/sourcing/${workspaceId}`);
          if (!body.workspace?.outreachDrafts.length) throw new Error("Prepare an introduction draft before opening final review.");
          onOpenIntroductionReview();
          return withGuidance({ ...body, reviewOpened: true, humanActionRequired: "The founder must review each draft and later choose a visible human-controlled contact channel. Nothing can be sent by this tool." });
        },
      },
    ];

    void Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))).catch((error) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      console.warn("[webmcp] sourcing tools unavailable", error);
    });
    return () => controller.abort();
  }, [onOpenIntroductionReview, onWorkspaceChanged, workspaceId]);

  return null;
}
