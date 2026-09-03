import type { SourcingFieldKey } from "./types";

export interface SourcingFieldDefinition {
  key: SourcingFieldKey;
  label: string;
  acknowledgementLabel?: string;
  hint: string;
  group: "product" | "run" | "business" | "founder" | "notes";
  shareByDefault: boolean;
  privateByDefault?: boolean;
  multiline?: boolean;
}

export const SOURCING_FIELD_DEFINITIONS: SourcingFieldDefinition[] = [
  { key: "brand_name", label: "Brand name", hint: "Leave this open if you have not decided yet", group: "founder", shareByDefault: true },
  { key: "product_name", label: "Product name", hint: "A working name is fine", group: "product", shareByDefault: true },
  { key: "product_category", label: "Product category", hint: "Bakery, beverage, sauce, snack, or another food category", group: "product", shareByDefault: true },
  { key: "product_format", label: "Product format", hint: "Example: mini loaf, snack bar, or 12 oz drink", group: "product", shareByDefault: true },
  { key: "product_type", label: "Product", hint: "Example: healthier energy drink", group: "product", shareByDefault: true },
  { key: "product_description", label: "Product description", hint: "What it is and who it is for", group: "product", shareByDefault: true, multiline: true },
  { key: "formula_status", label: "Is your recipe ready?", acknowledgementLabel: "recipe readiness", hint: "Idea, draft, tested, or ready to make", group: "product", shareByDefault: true },
  { key: "formulation_assistance", label: "Do you need help creating the recipe?", acknowledgementLabel: "formulation help", hint: "Recipe development or help scaling it up", group: "product", shareByDefault: true },
  { key: "carbonation", label: "Carbonation", hint: "Carbonated, still, or not sure", group: "product", shareByDefault: true },
  { key: "manufacturing_process", label: "Manufacturing process", hint: "Hot fill, cold fill, retort, HPP, or not sure", group: "product", shareByDefault: true },
  { key: "packaging_format", label: "Package", hint: "Can, bottle, jar, pouch, or not sure", group: "run", shareByDefault: true },
  { key: "packaging_size", label: "Package size", hint: "Example: 12 oz", group: "run", shareByDefault: true },
  { key: "production_volume", label: "How much do you want to make first?", acknowledgementLabel: "first-run volume", hint: "Units, cases, gallons, or pounds", group: "run", shareByDefault: true },
  { key: "budget", label: "Budget", hint: "Private unless you choose to share it", group: "business", shareByDefault: false, privateByDefault: true },
  { key: "certifications", label: "Certification needs", hint: "Required, preferred, not required, or still undecided", group: "run", shareByDefault: true },
  { key: "preferred_geography", label: "Where should your manufacturer be?", acknowledgementLabel: "manufacturer geography", hint: "State, region, or shipping radius", group: "business", shareByDefault: true },
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
  { key: "retail_channel", label: "Where you want to sell first", acknowledgementLabel: "first retail channels", hint: "Independent grocery, regional retail, online, or another starting point", group: "business", shareByDefault: true },
  { key: "target_retail_price", label: "Expected shelf price", hint: "A target is enough for now", group: "business", shareByDefault: false, privateByDefault: true },
  { key: "target_unit_cost", label: "Target cost per unit", hint: "Your cost ceiling before freight and retailer margin", group: "business", shareByDefault: false, privateByDefault: true },
  { key: "allergens", label: "Ingredients and allergens", acknowledgementLabel: "allergen requirements", hint: "Known allergens, exclusions, and cross-contact needs", group: "product", shareByDefault: true, multiline: true },
  { key: "case_pack", label: "Case pack", hint: "How many retail units go in one shipping case", group: "run", shareByDefault: true },
];

export const FIELD_DEFINITION_BY_KEY = Object.fromEntries(
  SOURCING_FIELD_DEFINITIONS.map((definition) => [definition.key, definition]),
) as Record<SourcingFieldKey, SourcingFieldDefinition>;

export const PRIMARY_FIELD_KEYS: SourcingFieldKey[] = [
  "product_name",
  "product_category",
  "product_format",
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
  "contact_email",
  "target_retail_price",
  "target_unit_cost",
]);
