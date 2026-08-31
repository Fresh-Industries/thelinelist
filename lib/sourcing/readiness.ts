import { FIELD_DEFINITION_BY_KEY } from "./fields";
import { getSourcingCategory } from "./questions";
import type { SourcingFieldKey, SourcingWorkspace } from "./types";

export const MATCH_SHAPING_FIELDS: SourcingFieldKey[] = [
  "product_format",
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
  searchReady: boolean;
  manufacturerReady: boolean;
  launchReady: boolean;
  packageDesignRequired: boolean;
  packageDesignReady: boolean;
  stageLabel: string;
  stageSummary: string;
  manufacturerMissing: SourcingFieldKey[];
  launchMissing: SourcingFieldKey[];
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
  brand_name: "A brand name helps identify the brief, but it can stay open while you make manufacturing decisions.",
  product_type: "This sets the manufacturing category and the questions that come next.",
  product_description: "A short product story lets a manufacturer understand the format, customer use, and unresolved development work without reconstructing the idea from separate fields.",
  packaging_format: "Manufacturers need a clear package direction. Refine it in 3D, then save the version you want included in the manufacturer brief.",
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
  return `${workspace.originalIdea ?? ""} ${workspace.fields.product_name?.value ?? ""} ${workspace.fields.product_category?.value ?? ""} ${workspace.fields.product_format?.value ?? ""} ${workspace.fields.product_type?.value ?? ""} ${workspace.fields.product_description?.value ?? ""}`.toLowerCase();
}

function prioritizeDecisions(workspace: SourcingWorkspace, keys: SourcingFieldKey[]): SourcingFieldKey[] {
  const category = getSourcingCategory(workspace);
  const priority: SourcingFieldKey[] = category === "bakery"
    ? ["product_type", "product_format", "storage_distribution", "production_volume", "formula_status", "formulation_assistance", "packaging_size", "packaging_format", "product_description", "certifications", "allergens"]
    : category === "beverage"
      ? ["product_type", "product_format", "formula_status", "formulation_assistance", "carbonation", "storage_distribution", "packaging_format", "packaging_size", "production_volume", "certifications", "allergens", "product_description"]
      : ["product_type", "product_format", "formula_status", "formulation_assistance", "storage_distribution", "production_volume", "packaging_format", "packaging_size", "certifications", "allergens", "product_description"];
  const position = new Map(priority.map((key, index) => [key, index]));
  return [...keys].sort((left, right) => (position.get(left) ?? priority.length) - (position.get(right) ?? priority.length));
}

export function requiredMatchingFields(workspace: SourcingWorkspace): SourcingFieldKey[] {
  const product = productText(workspace);
  const category = getSourcingCategory(workspace);
  const beverage = category === "beverage";
  const bakery = category === "bakery" || /\b(?:bar|bars|snack|snacks)\b/.test(product);
  const required: SourcingFieldKey[] = ["product_type", "product_format", "product_description"];
  if (!isUsefulConfirmedValue(workspace, "formula_status") && !isUsefulConfirmedValue(workspace, "formulation_assistance")) {
    required.push("formula_status");
  }
  if (beverage) required.push("carbonation");
  required.push("storage_distribution", "packaging_format");
  if (beverage || bakery) required.push("packaging_size");
  if (/\borganic\b/.test(product)) required.push("certifications");
  required.push("production_volume");
  return [...new Set(required)];
}

export function getSourcingReadiness(workspace: SourcingWorkspace): SourcingReadiness {
  const required = requiredMatchingFields(workspace);
  const packageDesignRequired = required.includes("packaging_format");
  const packageDesignReady = Boolean(workspace.packageDesign);
  const confirmed = required.filter((key) => isUsefulConfirmedValue(workspace, key) && (key !== "packaging_format" || packageDesignReady));
  const proposed = prioritizeDecisions(workspace, required.filter((key) => workspace.fields[key]?.status === "proposed"));
  const confirmedSet = new Set(confirmed);
  const proposedSet = new Set(proposed);
  const missing = prioritizeDecisions(workspace, required.filter((key) => !confirmedSet.has(key) && !proposedSet.has(key)));
  const hasProduct = isUsefulConfirmedValue(workspace, "product_type");
  const searchReady = hasProduct && MATCH_SHAPING_FIELDS.some((key) => isUsefulConfirmedValue(workspace, key));
  const manufacturerReady = confirmed.length === required.length;
  const launchFields: SourcingFieldKey[] = ["retail_channel", "target_retail_price", "target_unit_cost", "case_pack", "allergens", "target_launch_date"];
  const launchMissing = launchFields.filter((key) => !isUsefulConfirmedValue(workspace, key));
  const launchReady = manufacturerReady && launchMissing.length === 0;
  const matchingReady = manufacturerReady;
  const nextQuestionKey = missing[0] ?? proposed[0] ?? null;
  const percent = Math.round((confirmed.length / Math.max(required.length, 1)) * 100);
  const hasProductDefinition = hasProduct && confirmed.some((key) => ["product_format", "packaging_format", "packaging_size", "storage_distribution"].includes(key));
  const hasPreparedIntroduction = workspace.outreachDrafts.some((draft) => draft.approvedVersion !== null);
  const milestone = (workspace.inquiries.length || hasPreparedIntroduction) ? "introduction"
    : workspace.matches.length ? "match"
    : searchReady ? "commercial"
    : hasProductDefinition ? "product"
    : "concept";
  const milestoneLabel = ({
    concept: "Shape the idea",
    product: "Define the product",
    commercial: "Ready to research",
    match: "Compare manufacturers",
    introduction: "Introduction prepared",
  } as const)[milestone];
  const remaining = required.length - confirmed.length;
  const packageDesignPending = packageDesignRequired
    && !packageDesignReady
    && isUsefulConfirmedValue(workspace, "packaging_format");
  const summary = manufacturerReady
    ? "Your brief is ready for an introductory manufacturer fit conversation."
    : packageDesignPending
      ? "Your package format is captured. Refine and save the 3D direction before the manufacturer brief is ready."
    : searchReady
      ? "You can research manufacturers now while the remaining product decisions stay visibly open."
    : remaining === 1
      ? "One more useful product decision will make manufacturer research worthwhile."
      : "Add one product or packaging decision to begin useful manufacturer research.";
  const stageLabel = launchReady ? "Launch planning complete"
    : manufacturerReady ? "Manufacturer-ready brief"
    : searchReady ? "Ready to research"
    : "Shaping the idea";
  const stageSummary = launchReady
    ? "The planning brief has the core commercial decisions filled. Production, safety, and regulatory validation still belong with qualified partners."
    : manufacturerReady
      ? `${launchMissing.length} launch-planning decision${launchMissing.length === 1 ? " remains" : "s remain"}; they do not block an introductory fit conversation.`
      : summary;

  return {
    matchingReady,
    percent,
    searchReady,
    manufacturerReady,
    launchReady,
    packageDesignRequired,
    packageDesignReady,
    stageLabel,
    stageSummary,
    manufacturerMissing: missing,
    launchMissing,
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
  return getSourcingReadiness(workspace).searchReady;
}
