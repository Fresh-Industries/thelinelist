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
        description: "Update the canonical ProductPlan from the conversation. Keep originalIdea, brand_name, and product_type distinct. For no brand, not yet, or uncertainty, write brand_name as null with needs_decision and continue; never invent a brand. Mark a value confirmed only when the founder stated it clearly. Research-backed recommendations remain proposed with sources. After updating, read readiness and ask its single next useful question. When packaging needs visual judgment, ask the founder to open the page's real 3D packaging workbench.",
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
        name: "match_manufacturers",
        title: "Match manufacturers with evidence",
        description: "Find manufacturers only after the current plan passes its readiness gate. Return a small set with supported facts, possible conflicts, unknowns, source URLs, and review dates. Never describe an unknown capability as supported.",
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
        description: "Create up to three manufacturer-specific introduction drafts and private packet previews from confirmed, share-enabled fields. This creates draft state only and never sends or contacts anyone.",
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
