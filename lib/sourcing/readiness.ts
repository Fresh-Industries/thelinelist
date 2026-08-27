import { FIELD_DEFINITION_BY_KEY } from "./fields";
import type { SourcingFieldKey, SourcingWorkspace } from "./types";

export const MATCH_SHAPING_FIELDS: SourcingFieldKey[] = [
  "packaging_format",
  "packaging_size",
  "carbonation",
  "formulation_assistance",
  "formula_status",
  "manufacturing_process",
  "storage_distribution",
  "preferred_geography",
  "production_volume",
  "certifications",
  "allergens",
];

export interface SourcingReadiness {
  matchingReady: boolean;
  percent: number;
  milestone: "concept" | "product" | "commercial" | "match" | "introduction";
  milestoneLabel: string;
  confirmedRequirements: SourcingFieldKey[];
  missingRequirements: SourcingFieldKey[];
  proposedRequirements: SourcingFieldKey[];
  nextQuestionKey: SourcingFieldKey | null;
  nextQuestionLabel: string | null;
  whyItMatters: string | null;
  summary: string;
}

const WHY_IT_MATTERS: Partial<Record<SourcingFieldKey, string>> = {
  product_type: "This sets the manufacturing category and the questions that come next.",
  packaging_format: "Manufacturers need equipment that can form, fill, seal, or wrap your exact package.",
  packaging_size: "Size affects line compatibility, portion economics, labels, and case packing.",
  formula_status: "A manufacturer needs to know whether you need development help or are ready to scale.",
  formulation_assistance: "Some manufacturers develop formulas; others only run finished commercial formulas.",
  carbonation: "Carbonation requires a compatible beverage line and pressure-rated packaging.",
  storage_distribution: "Room-temperature, refrigerated, and frozen products need different processes, packaging, and distribution.",
  production_volume: "A first-run range is the fastest way to avoid manufacturers whose minimums are far too large.",
};

function isUsefulConfirmedValue(workspace: SourcingWorkspace, key: SourcingFieldKey): boolean {
  const field = workspace.fields[key];
  if (!field || field.status !== "confirmed" || !field.value) return false;
  return !/^(?:(?:i(?:'|’)m)\s+)?(?:not\s+)?sure(?:\s+yet)?[.!]?$/i.test(field.value.trim());
}

function productText(workspace: SourcingWorkspace): string {
  return `${workspace.fields.product_type?.value ?? ""} ${workspace.fields.product_description?.value ?? ""}`.toLowerCase();
}

export function requiredMatchingFields(workspace: SourcingWorkspace): SourcingFieldKey[] {
  const product = productText(workspace);
  const required: SourcingFieldKey[] = ["product_type", "packaging_format", "storage_distribution", "production_volume"];
  if (!isUsefulConfirmedValue(workspace, "formula_status") && !isUsefulConfirmedValue(workspace, "formulation_assistance")) {
    required.push("formula_status");
  }
  if (/\b(?:drink|drinks|beverage|beverages|juice|water|seltzer|coffee|tea)\b/.test(product)) required.push("carbonation");
  if (/\b(?:bread|bakery|cake|cakes|cookie|cookies|muffin|muffins|bar|bars|snack|snacks)\b/.test(product)) required.push("packaging_size");
  return [...new Set(required)];
}

export function getSourcingReadiness(workspace: SourcingWorkspace): SourcingReadiness {
  const required = requiredMatchingFields(workspace);
  const confirmed = required.filter((key) => isUsefulConfirmedValue(workspace, key));
  const proposed = required.filter((key) => workspace.fields[key]?.status === "proposed");
  const missing = required.filter((key) => !confirmed.includes(key) && !proposed.includes(key));
  const nextQuestionKey = proposed[0] ?? missing[0] ?? null;
  const matchingReady = confirmed.length === required.length;
  const percent = Math.round((confirmed.length / Math.max(required.length, 1)) * 100);
  const hasProduct = isUsefulConfirmedValue(workspace, "product_type");
  const hasProductDefinition = hasProduct && confirmed.some((key) => ["packaging_format", "packaging_size", "storage_distribution"].includes(key));
  const milestone = workspace.inquiries.length ? "introduction"
    : workspace.matches.length ? "match"
    : matchingReady ? "commercial"
    : hasProductDefinition ? "product"
    : "concept";
  const milestoneLabel = ({
    concept: "Shape the idea",
    product: "Define the product",
    commercial: "Ready to research",
    match: "Compare manufacturers",
    introduction: "Introduction sent",
  } as const)[milestone];
  const remaining = required.length - confirmed.length;
  const summary = matchingReady
    ? "You have enough confirmed information for a focused manufacturer search."
    : remaining === 1
      ? "One important decision remains before manufacturer matching."
      : `${remaining} important decisions remain before manufacturer matching.`;

  return {
    matchingReady,
    percent,
    milestone,
    milestoneLabel,
    confirmedRequirements: confirmed,
    missingRequirements: missing,
    proposedRequirements: proposed,
    nextQuestionKey,
    nextQuestionLabel: nextQuestionKey ? FIELD_DEFINITION_BY_KEY[nextQuestionKey].label : null,
    whyItMatters: nextQuestionKey ? WHY_IT_MATTERS[nextQuestionKey] ?? "This helps manufacturers decide whether the project fits their current line." : null,
    summary,
  };
}

export function hasMinimumMatchingInfo(workspace: SourcingWorkspace): boolean {
  return getSourcingReadiness(workspace).matchingReady;
}
