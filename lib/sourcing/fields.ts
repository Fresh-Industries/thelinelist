import type { SourcingFieldKey } from "./types";

export interface SourcingFieldDefinition {
  key: SourcingFieldKey;
  label: string;
  hint: string;
  group: "product" | "run" | "business" | "founder" | "notes";
  shareByDefault: boolean;
  privateByDefault?: boolean;
  multiline?: boolean;
}

export const SOURCING_FIELD_DEFINITIONS: SourcingFieldDefinition[] = [
  { key: "product_type", label: "Product", hint: "Example: healthier energy drink", group: "product", shareByDefault: true },
  { key: "product_description", label: "Product description", hint: "What it is and who it is for", group: "product", shareByDefault: true, multiline: true },
  { key: "formula_status", label: "Is your recipe ready?", hint: "Idea, draft, tested, or ready to make", group: "product", shareByDefault: true },
  { key: "formulation_assistance", label: "Do you need help creating the recipe?", hint: "Recipe development or help scaling it up", group: "product", shareByDefault: true },
  { key: "carbonation", label: "Carbonation", hint: "Carbonated, still, or not sure", group: "product", shareByDefault: true },
  { key: "manufacturing_process", label: "Manufacturing process", hint: "Hot fill, cold fill, retort, HPP, or not sure", group: "product", shareByDefault: true },
  { key: "packaging_format", label: "Package", hint: "Can, bottle, jar, pouch, or not sure", group: "run", shareByDefault: true },
  { key: "packaging_size", label: "Package size", hint: "Example: 12 oz", group: "run", shareByDefault: true },
  { key: "production_volume", label: "How much do you want to make first?", hint: "Units, cases, gallons, or pounds", group: "run", shareByDefault: true },
  { key: "budget", label: "Budget", hint: "Private unless you choose to share it", group: "business", shareByDefault: false, privateByDefault: true },
  { key: "certifications", label: "Required certifications", hint: "Organic, kosher, SQF, or other requirements", group: "run", shareByDefault: true },
  { key: "preferred_geography", label: "Where should your manufacturer be?", hint: "State, region, or shipping radius", group: "business", shareByDefault: true },
  { key: "target_launch_date", label: "Target launch", hint: "Date or timeframe", group: "business", shareByDefault: true },
  { key: "ingredient_sourcing", label: "Ingredient sourcing", hint: "Who should source ingredients", group: "run", shareByDefault: true },
  { key: "packaging_sourcing", label: "Packaging sourcing", hint: "Who should source packaging", group: "run", shareByDefault: true },
  { key: "storage_distribution", label: "Storage and distribution", hint: "Ambient, refrigerated, frozen, and freight needs", group: "run", shareByDefault: true, multiline: true },
  { key: "confirmed_decisions", label: "Confirmed decisions", hint: "Decisions that should guide every match", group: "notes", shareByDefault: false, multiline: true },
  { key: "proposed_assumptions", label: "Proposed assumptions", hint: "Ideas still waiting for your decision", group: "notes", shareByDefault: false, multiline: true },
  { key: "missing_information", label: "Missing information", hint: "Open questions to resolve", group: "notes", shareByDefault: false, multiline: true },
  { key: "internal_notes", label: "Internal notes", hint: "Never included in the manufacturer packet", group: "notes", shareByDefault: false, privateByDefault: true, multiline: true },
  { key: "manufacturer_information", label: "What the manufacturer will see", hint: "Useful context you want manufacturers to know", group: "notes", shareByDefault: true, multiline: true },
  { key: "founder_name", label: "Your name", hint: "Name used in outreach", group: "founder", shareByDefault: true },
  { key: "company_name", label: "Company or brand", hint: "Use a working name if needed", group: "founder", shareByDefault: true },
  { key: "company_introduction", label: "Founder or company introduction", hint: "A short, practical introduction", group: "founder", shareByDefault: true, multiline: true },
  { key: "contact_email", label: "Contact email", hint: "Shared only when selected", group: "founder", shareByDefault: true },
  { key: "contact_phone", label: "Contact phone", hint: "Optional", group: "founder", shareByDefault: false },
];

export const FIELD_DEFINITION_BY_KEY = Object.fromEntries(
  SOURCING_FIELD_DEFINITIONS.map((definition) => [definition.key, definition]),
) as Record<SourcingFieldKey, SourcingFieldDefinition>;

export const PRIMARY_FIELD_KEYS: SourcingFieldKey[] = [
  "product_type",
  "product_description",
  "formula_status",
  "formulation_assistance",
  "carbonation",
  "packaging_format",
  "packaging_size",
  "production_volume",
  "budget",
  "preferred_geography",
  "target_launch_date",
];

export const NEVER_SHARE_FIELD_KEYS = new Set<SourcingFieldKey>([
  "internal_notes",
  "confirmed_decisions",
  "proposed_assumptions",
  "missing_information",
]);
