"use client";

import { useEffect } from "react";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import type { SourcingWorkspace } from "@/lib/sourcing/types";

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
    const fieldKeys = [
      "product_type", "product_description", "formula_status", "formulation_assistance", "carbonation", "manufacturing_process",
      "packaging_format", "packaging_size", "production_volume", "budget", "certifications", "preferred_geography", "target_launch_date",
      "ingredient_sourcing", "packaging_sourcing", "storage_distribution", "confirmed_decisions", "proposed_assumptions", "missing_information",
      "internal_notes", "manufacturer_information", "founder_name", "company_name", "company_introduction", "contact_email", "contact_phone",
      "retail_channel", "target_retail_price", "target_unit_cost", "allergens", "case_pack",
    ];
    const withGuidance = (body: ToolResponse) => {
      if (body.workspace) onWorkspaceChanged(body.workspace);
      return body.workspace ? {
        ...body,
        readiness: getSourcingReadiness(body.workspace),
        whatChanged: body.workspace.activity[0]?.message ?? null,
        finalSendRequiresHumanClick: true,
      } : body;
    };

    const tools: WebMcpToolDefinition[] = [
      {
        name: "get_sourcing_workspace",
        title: "Read sourcing workspace",
        description: "Read the product plan on the current page, including confirmed and proposed decisions, source evidence, readiness, the single best next question, manufacturer matches, private sharing choices, and introduction status. Never ask the founder for a workspace ID.",
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
        description: "Update the current product plan from the conversation. Mark a value confirmed only when the founder stated it clearly. Uncertain statements and research-backed recommendations must remain proposed or needs_decision, with source links when research informed the suggestion. Ask one simple question at a time after updating.",
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
          const body = await api(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ proposedUpdates: args.proposedUpdates }) });
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
        description: "Create manufacturer-specific outreach drafts and private packet previews from confirmed, share-enabled fields. This creates draft state only and never sends a message.",
        inputSchema: {
          type: "object",
          properties: {
            selectedManufacturerIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
            founderInstructions: { type: "string" },
            proposedSharedFields: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: 26 },
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
        title: "Open final introduction review",
        description: "Open the current page's final introduction review so the founder can inspect the recipient, exact message, shared product details, and private fields. This never sends anything. The final send can only happen when the founder personally clicks the website's named send button.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          void input;
          const body = await api(`/api/sourcing/${workspaceId}`);
          if (!body.workspace?.outreachDrafts.length) throw new Error("Prepare an introduction draft before opening final review.");
          onOpenIntroductionReview();
          return withGuidance({ ...body, reviewOpened: true, humanActionRequired: "The founder must review and click the final send button on The Line List." });
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
