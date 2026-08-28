"use client";

import dynamic from "next/dynamic";
import type { BottleFinish, PackagingType } from "./package-config";

export type ProductMockupProps = {
  packagingType: PackagingType;
  logoUrl?: string;
  logoAspect?: number;
  baseColor?: string;
  labelColor?: string;
  bottleFinish?: BottleFinish;
  logoScale?: number;
  logoPosition?: { x: number; y: number };
  sceneKey?: number;
  variant?: "studio" | "thumbnail";
};

const ProductMockupCanvas = dynamic(() => import("./ProductMockupCanvas"), {
  ssr: false,
  loading: () => (
    <div className="product-mockup-loading" role="status">
      <span aria-hidden="true" />
      Warming up the studio…
    </div>
  ),
});

export function ProductMockup(props: ProductMockupProps) {
  return (
    <div className="product-mockup" data-packaging-type={props.packagingType} data-preview-variant={props.variant ?? "studio"}>
      <ProductMockupCanvas {...props} />
    </div>
  );
}
