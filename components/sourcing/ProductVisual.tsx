import type { ProductCategory } from "@/lib/sourcing/product-catalog";
import { resolveProductVisualAsset } from "@/lib/sourcing/product-catalog";
import Image from "next/image";

export function ProductVisual({
  category,
  productType,
  packagingType,
  artworkUrl,
  variant = "product",
  size = "medium",
  priority = false,
  className = "",
}: {
  category: ProductCategory;
  productType?: string | null;
  packagingType?: string | null;
  artworkUrl?: string | null;
  variant?: "blank" | "product" | "artwork-preview";
  size?: "small" | "medium" | "large";
  priority?: boolean;
  className?: string;
}) {
  const asset = resolveProductVisualAsset({ category, packagingType, productType });
  const dimensions = size === "large" ? 420 : size === "small" ? 150 : 260;
  return (
    <figure className={`product-visual product-visual-${size} product-visual-${variant} ${className}`.trim()}>
      {asset.imageSrc ? <Image src={asset.imageSrc} alt={asset.imageAlt} width={dimensions} height={dimensions} priority={priority} sizes={size === "large" ? "(max-width: 760px) 72vw, 420px" : size === "small" ? "130px" : "(max-width: 760px) 45vw, 260px"} /> : null}
      {variant === "artwork-preview" && artworkUrl ? <span className="product-artwork-preview"><Image src={artworkUrl} alt="Your uploaded product artwork" width={96} height={96} unoptimized /><small>Attached artwork</small></span> : null}
    </figure>
  );
}
