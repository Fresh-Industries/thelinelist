import type { SourcingFieldKey } from "./types";

export const MATCHABLE_REQUIREMENT_KEYS = [
  "product_type",
  "packaging_format",
  "packaging_size",
  "carbonation",
  "formulation_assistance",
  "manufacturing_process",
  "preferred_geography",
  "certifications",
  "production_volume",
  "storage_distribution",
  "allergens",
] as const satisfies readonly SourcingFieldKey[];

export type MatchableRequirementKey = (typeof MATCHABLE_REQUIREMENT_KEYS)[number];
