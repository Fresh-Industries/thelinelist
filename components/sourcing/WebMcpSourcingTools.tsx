"use client";

import { useEffect } from "react";
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
}: {
  workspaceId: string;
  onWorkspaceChanged: (workspace: SourcingWorkspace) => void;
}) {
  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const workspaceProperty = { type: "string", const: workspaceId, description: "The private sourcing workspace identifier from the current page." };
    const fieldKeys = [
      "product_type", "product_description", "formula_status", "formulation_assistance", "carbonation", "manufacturing_process",
      "packaging_format", "packaging_size", "production_volume", "budget", "certifications", "preferred_geography", "target_launch_date",
      "ingredient_sourcing", "packaging_sourcing", "storage_distribution", "confirmed_decisions", "proposed_assumptions", "missing_information",
      "internal_notes", "manufacturer_information", "founder_name", "company_name", "company_introduction", "contact_email", "contact_phone",
    ];
    const updateWorkspace = (body: ToolResponse) => {
      if (body.workspace) onWorkspaceChanged(body.workspace);
      return body;
    };
    const assertWorkspace = (input: unknown) => {
      if (!input || typeof input !== "object" || (input as { workspaceId?: unknown }).workspaceId !== workspaceId) {
        throw new Error("The tool call does not target the active private workspace.");
      }
      return input as Record<string, unknown>;
    };

    const tools: WebMcpToolDefinition[] = [
      {
        name: "get_sourcing_workspace",
        title: "Read sourcing workspace",
        description: "Read the current visible sourcing brief, founder decisions, missing requirements, manufacturer matches, outreach drafts, packet visibility, and inquiry status. Use this instead of scraping the page.",
        inputSchema: { type: "object", properties: { workspaceId: workspaceProperty }, required: ["workspaceId"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          assertWorkspace(input);
          return api(`/api/sourcing/${workspaceId}`);
        },
      },
      {
        name: "update_sourcing_workspace",
        title: "Propose sourcing brief updates",
        description: "Add several structured sourcing-brief updates to the visible workspace. Explicit founder statements may be confirmed; inferred values always remain proposed until the founder confirms them in the website.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: workspaceProperty,
            proposedUpdates: {
              type: "array", minItems: 1, maxItems: 26,
              items: {
                type: "object",
                properties: {
                  key: { type: "string", enum: fieldKeys },
                  value: { type: ["string", "null"] },
                  reason: { type: "string" },
                  source: { type: "string" },
                  explicitlyStated: { type: "boolean" },
                  suggestedSharing: { type: "boolean" },
                },
                required: ["key", "value", "explicitlyStated"],
                additionalProperties: false,
              },
            },
          },
          required: ["workspaceId", "proposedUpdates"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = assertWorkspace(input);
          const body = await api(`/api/sourcing/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ proposedUpdates: args.proposedUpdates }) });
          return updateWorkspace(body);
        },
      },
      {
        name: "match_manufacturers",
        title: "Match manufacturers with evidence",
        description: "Use confirmed structured requirements to return potential manufacturer matches with supported facts, possible conflicts, unknowns, source URLs, and review dates. Missing information is never treated as a negative capability.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: workspaceProperty,
            geographyPreference: { type: "string" },
            resultLimit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
            requiredRequirements: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: 15 },
            preferredRequirements: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: 15 },
          },
          required: ["workspaceId"], additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          const args = assertWorkspace(input);
          const body = await api(`/api/sourcing/${workspaceId}/match`, { method: "POST", body: JSON.stringify(args) });
          return updateWorkspace(body);
        },
      },
      {
        name: "prepare_manufacturer_outreach",
        title: "Prepare manufacturer outreach",
        description: "Create manufacturer-specific outreach drafts and private packet previews from confirmed, share-enabled fields. This creates draft state only and never sends a message.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: workspaceProperty,
            selectedManufacturerIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
            founderInstructions: { type: "string" },
            proposedSharedFields: { type: "array", items: { type: "string", enum: fieldKeys }, maxItems: 26 },
          },
          required: ["workspaceId", "selectedManufacturerIds"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = assertWorkspace(input);
          const body = await api(`/api/sourcing/${workspaceId}/outreach`, { method: "POST", body: JSON.stringify(args) });
          return updateWorkspace(body);
        },
      },
      {
        name: "send_manufacturer_inquiry",
        title: "Send approved manufacturer inquiry",
        description: "Send one previously prepared inquiry to the configured safe demo inbox. The call is rejected unless the founder approved the exact visible content version. Duplicate sends are blocked.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: workspaceProperty,
            outreachDraftId: { type: "string", format: "uuid" },
            approvedContentVersion: { type: "integer", minimum: 1 },
          },
          required: ["workspaceId", "outreachDraftId", "approvedContentVersion"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          const args = assertWorkspace(input);
          const body = await api(`/api/sourcing/${workspaceId}/send`, { method: "POST", body: JSON.stringify(args) });
          return updateWorkspace(body);
        },
      },
    ];

    void Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))).catch((error) => {
      console.warn("[webmcp] sourcing tools unavailable", error);
    });
    return () => controller.abort();
  }, [onWorkspaceChanged, workspaceId]);

  return null;
}
