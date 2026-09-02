import type { SourcingWorkspace } from "./types";

export type ProductCategory = "bakery" | "sauce" | "beverage" | "snack" | "frozen" | "food";
export type SourcingQuestionCategory = "beverage" | "bakery" | "food";

const CONFIRMED_CATEGORY_LABELS: Record<string, ProductCategory> = {
  "baked good": "bakery",
  "baked goods": "bakery",
  bakery: "bakery",
  "packaged bakery quick bread": "bakery",
  beverage: "beverage",
  beverages: "beverage",
  drink: "beverage",
  drinks: "beverage",
  sauce: "sauce",
  "sauce condiment": "sauce",
  "sauces condiments": "sauce",
  snack: "snack",
  snacks: "snack",
  "snack food": "snack",
  "snack foods": "snack",
  frozen: "frozen",
  "frozen food": "frozen",
  "frozen foods": "frozen",
  food: "food",
  foods: "food",
  "other food": "food",
  "prepared food": "food",
  "prepared foods": "food",
};

const CATEGORY_PATTERNS: Array<[ProductCategory, RegExp]> = [
  ["bakery", /\b(?:bread|bakery|cake|cakes|muffin|muffins|cookie|cookies|brownie|brownies|pastry|pastries|loaf|loaves)\b/],
  ["sauce", /\b(?:hot sauce|salsa|sauce|sauces|condiment|condiments|dressing|dressings|marinade|marinades)\b/],
  ["snack", /\b(?:snack|snacks|protein bar|granola bar|bar|bars|chip|chips|cracker|crackers|granola|popcorn)\b/],
  ["beverage", /\b(?:drink|drinks|beverage|beverages|juice|water|seltzer|coffee|tea|soda|shot|shots)\b/],
  ["frozen", /\b(?:frozen|ice cream)\b/],
  ["food", /\b(?:food|foods|meal|meals|prepared)\b/],
];

function normalizeCategoryLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveProductCategoryFromText(value: string): ProductCategory | null {
  const normalized = value.toLowerCase();
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

function resolveConfirmedCategoryLabel(value: string): ProductCategory | null {
  return CONFIRMED_CATEGORY_LABELS[normalizeCategoryLabel(value)] ?? resolveProductCategoryFromText(value);
}

export function getProductCategory(workspace: SourcingWorkspace): ProductCategory {
  const declaredCategory = workspace.fields.product_category;
  if (declaredCategory.status === "confirmed" && declaredCategory.value) {
    const category = resolveConfirmedCategoryLabel(declaredCategory.value);
    if (category) return category;
  }

  for (const key of ["product_type", "product_format"] as const) {
    const field = workspace.fields[key];
    if (field.status !== "confirmed" || !field.value) continue;
    const category = resolveProductCategoryFromText(field.value);
    if (category) return category;
  }

  const fallback = [
    workspace.fields.product_name.value,
    workspace.fields.product_description.value,
    workspace.originalIdea,
  ].filter(Boolean).join(" ");
  return resolveProductCategoryFromText(fallback) ?? "food";
}

export function getSourcingQuestionCategory(workspace: SourcingWorkspace): SourcingQuestionCategory {
  const category = getProductCategory(workspace);
  if (category === "beverage") return "beverage";
  if (category === "bakery") return "bakery";
  return "food";
}
