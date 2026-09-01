import type { PackagingType } from "@/components/product-visuals/package-config";
import type { ProductCategory } from "./product-catalog";

const RECOMMENDED_WORKBENCH_PACKAGES: Record<ProductCategory, readonly PackagingType[]> = {
  bakery: ["bakery-bag"],
  beverage: ["slim-can", "bottle"],
  food: ["stand-up-pouch", "jar"],
  frozen: ["stand-up-pouch"],
  sauce: ["bottle", "jar"],
  snack: ["stand-up-pouch"],
};

export function getRecommendedWorkbenchPackageTypes(category: ProductCategory): PackagingType[] {
  return [...RECOMMENDED_WORKBENCH_PACKAGES[category]];
}
