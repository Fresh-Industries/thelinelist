import { getProductJourney } from "./product-journey";
import { getProductCategory, getProductDescriptor, getProductName, type ProductCategory } from "./product-catalog";
import { getSourcingReadiness } from "./readiness";
import type { SourcingWorkspace } from "./types";

const RECENT_PRODUCTS_KEY = "the-line-list:recent-products:v1";

export interface RecentProduct {
  id: string;
  name: string;
  descriptor: string;
  category: ProductCategory;
  productType: string | null;
  packagingType: string | null;
  stage: string;
  status: string;
  updatedAt: string;
}

function productSummary(workspace: SourcingWorkspace): RecentProduct {
  const journey = getProductJourney(workspace);
  const current = journey.find((step) => step.status === "current") ?? journey.at(-1)!;
  return {
    id: workspace.id,
    name: getProductName(workspace),
    descriptor: getProductDescriptor(workspace),
    category: getProductCategory(workspace),
    productType: workspace.fields.product_type.value,
    packagingType: workspace.fields.packaging_format.value,
    stage: current.label,
    status: getSourcingReadiness(workspace).summary,
    updatedAt: workspace.updatedAt,
  };
}

export function readRecentProducts(): RecentProduct[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_PRODUCTS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentProduct => Boolean(item && typeof item === "object" && "id" in item && typeof item.id === "string" && "name" in item && typeof item.name === "string")).slice(0, 4);
  } catch {
    return [];
  }
}

export function persistRecentProduct(workspace: SourcingWorkspace): RecentProduct[] {
  const next = [productSummary(workspace), ...readRecentProducts().filter((item) => item.id !== workspace.id)].slice(0, 4);
  window.localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(next));
  return next;
}
