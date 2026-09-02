import type { SourcingFieldKey, SourcingWorkspace } from "./types";
import { getSourcingQuestionCategory } from "./product-category";

export function getSourcingCategory(workspace: SourcingWorkspace): "beverage" | "bakery" | "food" {
  return getSourcingQuestionCategory(workspace);
}

const GENERIC_QUESTIONS: Partial<Record<SourcingFieldKey, string>> = {
  brand_name: "Do you already have a brand name? It is completely fine if you are still deciding.",
  product_type: "What is the product, in the simplest words you would use with a customer?",
  product_format: "How should one customer buy and use the product?",
  product_description: "In one sentence, what is the product promise, who is it for, and what still needs development?",
  packaging_format: "What package are you leaning toward? You can compare supported options in the 3D workbench before saving one.",
  packaging_size: "What size or portion should one retail unit contain? A rough answer is enough.",
  formula_status: "How far along is the recipe: idea, draft, tested, or ready to scale?",
  formulation_assistance: "Would you want the manufacturer to help develop or scale the recipe?",
  carbonation: "Should the drink be carbonated, still, or is that still open?",
  storage_distribution: "Should the finished product be shelf-stable, refrigerated, or frozen? If you are unsure, say that.",
  production_volume: "What first run feels realistic? A range such as 1,000–5,000 units works well.",
  certifications: "Which certification is a real requirement for the first run, and which is only a future goal?",
  allergens: "Which ingredients, exclusions, or allergen controls must the first formula satisfy?",
  preferred_geography: "Where would you prefer to manufacture, and is that a requirement or just a freight preference?",
};

export function getSourcingQuestion(workspace: SourcingWorkspace, key: SourcingFieldKey): string {
  const category = getSourcingCategory(workspace);
  if (key === "carbonation" && category !== "beverage") {
    return "Is carbonation relevant to this product, or should it be marked not applicable?";
  }
  if (key === "product_format" && category === "beverage") {
    return "How should one customer buy and drink it—for example, a 12 oz slim can, another can size, or a bottle?";
  }
  if (key === "product_format" && category === "bakery") {
    return "How should one customer buy and eat it—for example, a mini loaf, wrapped slice, or full loaf?";
  }
  if (key === "product_description" && category === "beverage") {
    return "In one sentence, what should the drink do for the customer, who is it for, and what formula work is still open?";
  }
  if (key === "formula_status" && category === "beverage") {
    return "Is the beverage formula still an idea, a bench sample, tested, or already ready to scale?";
  }
  if (key === "allergens" && category === "beverage") {
    return "What formula targets must the drink meet—for example caffeine source or amount, sweetener direction, electrolytes, and ingredient exclusions?";
  }
  return GENERIC_QUESTIONS[key] ?? `What should manufacturers know about this ${key.replaceAll("_", " ")}?`;
}

export function getCategoryDecisionGuardrails(workspace: SourcingWorkspace): string[] {
  if (getSourcingCategory(workspace) !== "beverage") return [];
  return [
    "Treat healthy, clean energy, and hydration as product goals until the formula and label claims are reviewed.",
    "Treat organic as a certification and sourcing requirement, not as a validated claim, until the intended label category is confirmed.",
    "Shelf-stable is a desired outcome until a qualified production partner validates the formula, process, packaging, and shelf life.",
    "Capture caffeine, sweetener, electrolyte, flavor, and ingredient-exclusion targets before calling the formula production-ready.",
  ];
}
