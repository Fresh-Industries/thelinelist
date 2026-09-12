import type { SourcingFieldKey } from "@/lib/sourcing/types";

export interface GuidePlanAction { key: SourcingFieldKey; question: string; placeholder: string }

export function guidePlanAction(slug: string): GuidePlanAction {
  if (["food-processing-methods", "refrigerated-food-manufacturing", "frozen-food-cold-chain", "cold-pressed-juice"].includes(slug)) {
    return { key: "storage_distribution", question: "How do you want the finished product stored?", placeholder: "For example: sold refrigerated; shelf-life work is still needed" };
  }
  if (slug === "packaging-formats" || slug === "private-label-bottled-water") {
    return { key: "packaging_format", question: "What packaging direction are you considering?", placeholder: "For example: a bottle, with the exact material still open" };
  }
  if (slug === "food-manufacturing-certifications") {
    return { key: "certifications", question: "Which certifications are required, preferred, or still open?", placeholder: "For example: kosher is preferred; buyer requirements are still open" };
  }
  if (slug === "test-food-business-idea") {
    return { key: "retail_channel", question: "Where do you want to try selling first?", placeholder: "For example: local specialty shops; I still need to talk with buyers" };
  }
  if (["first-production-run", "food-manufacturing-moqs", "dry-blending", "bakery-manufacturing"].includes(slug)) {
    return { key: "production_volume", question: "About how much would you like to make first?", placeholder: "Include a unit, such as bottles, individual bags, or pounds. A rough range is okay." };
  }
  if (["food-product-development", "co-packer-vs-private-label", "start-hot-sauce", "energy-drink"].includes(slug)) {
    return { key: "formula_status", question: "Where are you with the recipe?", placeholder: "For example: I have a home recipe and need help making it work at a larger scale" };
  }
  return { key: "formulation_assistance", question: "What development help do you need?", placeholder: "For example: help refining my recipe and testing it on production equipment" };
}
