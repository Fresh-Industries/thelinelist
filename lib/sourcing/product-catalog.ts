import type { SourcingWorkspace } from "./types";
import { getProductDescriptor as getCanonicalProductDescriptor, getProductIdentity } from "./product-identity";

export type ProductCategory = "bakery" | "sauce" | "beverage" | "snack" | "frozen" | "food";

export interface PackagingOption {
  id: string;
  label: string;
  value: string;
  description: string;
  imageSrc: string | null;
  imageAlt: string;
}

const PACKAGING_BY_CATEGORY: Record<ProductCategory, PackagingOption[]> = {
  bakery: [
    { id: "flow-wrap", label: "Flow wrap", value: "Flow wrap", description: "Common for shelf-stable mini loaves", imageSrc: "/images/clay-v2/packaging/flow-wrap-mini-loaf.png", imageAlt: "Clay mini banana bread loaf in clear flow wrap" },
    { id: "bakery-bag", label: "Bakery bag", value: "Bakery bag", description: "Good for fresh baked goods", imageSrc: "/images/clay-v2/packaging/bakery-bag-mini-loaf.png", imageAlt: "Clay mini banana bread loaf in a gathered bakery bag" },
    { id: "clamshell", label: "Clamshell", value: "Clamshell", description: "Clear protection and visibility", imageSrc: "/images/clay-v2/packaging/clamshell-mini-loaf.png", imageAlt: "Clay mini banana bread loaf in a clear clamshell" },
    { id: "tray-film", label: "Tray + film", value: "Tray and film", description: "Useful for some chilled products", imageSrc: "/images/clay-v2/packaging/tray-film-mini-loaf.png", imageAlt: "Clay mini banana bread loaf in a tray with clear film" },
  ],
  sauce: [
    { id: "glass-sauce-bottle", label: "Glass sauce bottle", value: "Glass sauce bottle", description: "A familiar retail format for pourable sauces", imageSrc: "/images/clay-v2/products/hot-sauce.webp", imageAlt: "Clay hot sauce bottle" },
    { id: "plastic-sauce-bottle", label: "Plastic sauce bottle", value: "Plastic sauce bottle", description: "Lightweight and practical for many sauces", imageSrc: "/images/clay-v2/products/sauce.webp", imageAlt: "Clay sauce bottle" },
    { id: "squeeze-bottle", label: "Squeeze bottle", value: "Squeeze bottle", description: "Useful when controlled dispensing matters", imageSrc: "/images/clay-v2/products/dressings-marinades.webp", imageAlt: "Clay squeeze bottle" },
    { id: "jar", label: "Jar", value: "Jar", description: "Useful for spoonable sauces and condiments", imageSrc: "/images/clay-v2/products/salsa.webp", imageAlt: "Clay food jar" },
  ],
  beverage: [
    { id: "standard-can", label: "Standard can", value: "Standard aluminum can", description: "A common format for carbonated drinks", imageSrc: "/images/clay-v2/products/energy-drink.webp", imageAlt: "Clay beverage can" },
    { id: "slim-can", label: "Slim can", value: "Slim aluminum can", description: "A narrower can often used for energy drinks", imageSrc: "/images/clay-v2/products/functional-beverages.webp", imageAlt: "Clay slim beverage can" },
    { id: "glass-bottle", label: "Glass bottle", value: "Glass bottle", description: "A heavier package with a premium feel", imageSrc: "/images/clay-v2/products/soda.webp", imageAlt: "Clay glass beverage bottle" },
    { id: "plastic-bottle", label: "Plastic bottle", value: "Plastic bottle", description: "Lightweight and available in many sizes", imageSrc: "/images/clay-v2/products/water.webp", imageAlt: "Clay plastic beverage bottle" },
  ],
  snack: [
    { id: "flow-wrap-bar", label: "Flow-wrapped bar", value: "Flow-wrapped bar", description: "A common single-serve snack format", imageSrc: "/images/clay-v2/support/idea-to-product.webp", imageAlt: "Clay food product moving toward finished packaging" },
    { id: "snack-bag", label: "Snack bag", value: "Snack bag", description: "Useful for loose or bite-sized snacks", imageSrc: "/images/clay-v2/support/idea-to-product.webp", imageAlt: "Clay food product moving toward finished packaging" },
    { id: "stand-up-pouch", label: "Stand-up pouch", value: "Stand-up pouch", description: "Resealable and shelf-friendly", imageSrc: "/images/clay-v2/support/idea-to-product.webp", imageAlt: "Clay food product moving toward finished packaging" },
  ],
  frozen: [
    { id: "frozen-bag", label: "Frozen bag", value: "Frozen bag", description: "Flexible packaging for frozen distribution", imageSrc: "/images/clay-v2/products/prepared-refrigerated-foods.webp", imageAlt: "Clay prepared food package" },
    { id: "frozen-box", label: "Frozen box", value: "Frozen carton", description: "A rigid retail format with room for instructions", imageSrc: "/images/clay-v2/products/prepared-refrigerated-foods.webp", imageAlt: "Clay prepared food package" },
    { id: "tray-film", label: "Tray + film", value: "Tray and film", description: "Useful for prepared meals and portions", imageSrc: "/images/clay-v2/products/prepared-refrigerated-foods.webp", imageAlt: "Clay prepared food package" },
  ],
  food: [
    { id: "pouch", label: "Stand-up pouch", value: "Stand-up pouch", description: "A flexible starting point for many foods", imageSrc: "/images/clay-v2/support/idea-to-product.webp", imageAlt: "Clay food product moving toward finished packaging" },
    { id: "jar", label: "Jar", value: "Jar", description: "Useful for spoonable and shelf-stable foods", imageSrc: "/images/clay-v2/products/salsa.webp", imageAlt: "Clay food jar" },
    { id: "tray-film", label: "Tray + film", value: "Tray and film", description: "Useful for prepared and chilled foods", imageSrc: "/images/clay-v2/products/prepared-refrigerated-foods.webp", imageAlt: "Clay prepared food package" },
  ],
};

export function productText(workspace: SourcingWorkspace): string {
  return ["product_name", "product_category", "product_format", "product_type", "product_description"]
    .map((key) => workspace.fields[key as keyof typeof workspace.fields]?.value ?? "")
    .join(" ")
    .toLowerCase();
}

export function getProductCategory(workspace: SourcingWorkspace): ProductCategory {
  const text = productText(workspace);
  if (/bread|bakery|cake|muffin|cookie|brownie|pastr|loaf/.test(text)) return "bakery";
  if (/hot sauce|salsa|sauce|condiment|dressing|marinade/.test(text)) return "sauce";
  if (/drink|beverage|juice|water|seltzer|coffee|tea|soda|shot/.test(text)) return "beverage";
  if (/snack|bar|chip|cracker|granola/.test(text)) return "snack";
  if (/frozen|ice cream/.test(text)) return "frozen";
  return "food";
}

export function getPackagingOptions(workspace: SourcingWorkspace): PackagingOption[] {
  return PACKAGING_BY_CATEGORY[getProductCategory(workspace)];
}

export function getPackagingOptionsForCategory(category: ProductCategory): PackagingOption[] {
  return PACKAGING_BY_CATEGORY[category];
}

export function resolveProductVisualAsset(input: { category: ProductCategory; packagingType?: string | null; productType?: string | null }): Pick<PackagingOption, "imageSrc" | "imageAlt"> {
  const packaging = input.packagingType?.toLowerCase();
  const option = packaging
    ? PACKAGING_BY_CATEGORY[input.category].find((candidate) => packaging.includes(candidate.value.toLowerCase()) || candidate.value.toLowerCase().includes(packaging))
    : null;
  if (option?.imageSrc) return { imageSrc: option.imageSrc, imageAlt: option.imageAlt };
  if (input.category === "beverage") return { imageSrc: "/images/clay-v2/products/energy-drink.webp", imageAlt: "Clay beverage product" };
  if (input.category === "sauce") return { imageSrc: "/images/clay-v2/products/hot-sauce.webp", imageAlt: "Clay sauce product" };
  if (input.category === "bakery") return { imageSrc: "/images/clay-v2/packaging/flow-wrap-mini-loaf.png", imageAlt: "Clay mini loaf packaging" };
  return { imageSrc: "/images/clay-v2/support/idea-to-product.webp", imageAlt: `Clay ${input.productType || "food product"} idea becoming a packaged product` };
}

export function getPackagingOption(workspace: SourcingWorkspace): PackagingOption | null {
  const value = workspace.fields.packaging_format.value?.toLowerCase();
  if (!value) return null;
  return getPackagingOptions(workspace).find((option) => value.includes(option.value.toLowerCase()) || option.value.toLowerCase().includes(value)) ?? null;
}

export function getProductName(workspace: SourcingWorkspace): string {
  const identity = getProductIdentity(workspace);
  return identity.brandName || identity.productDescriptor;
}

export function getProductDescriptor(workspace: SourcingWorkspace): string {
  return getCanonicalProductDescriptor(workspace);
}

export function getBrandName(workspace: SourcingWorkspace): string | null {
  return getProductIdentity(workspace).brandName;
}
