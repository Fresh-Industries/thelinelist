import type { SourcingFieldKey, SourcingWorkspace } from "./types";

export const MATCH_SHAPING_FIELDS: SourcingFieldKey[] = [
  "packaging_format",
  "packaging_size",
  "carbonation",
  "formulation_assistance",
  "manufacturing_process",
  "preferred_geography",
  "production_volume",
  "certifications",
];

function isUsefulConfirmedValue(workspace: SourcingWorkspace, key: SourcingFieldKey): boolean {
  const field = workspace.fields[key];
  if (field.status !== "confirmed" || !field.value) return false;
  return !/^(?:i(?:'|’)m |not )?sure(?: yet)?$/i.test(field.value.trim());
}

export function hasMinimumMatchingInfo(workspace: SourcingWorkspace): boolean {
  if (!isUsefulConfirmedValue(workspace, "product_type")) return false;
  const unresolvedSuggestion = MATCH_SHAPING_FIELDS.some((key) => workspace.fields[key].status === "proposed");
  if (unresolvedSuggestion) return false;
  return MATCH_SHAPING_FIELDS.some((key) => isUsefulConfirmedValue(workspace, key));
}
