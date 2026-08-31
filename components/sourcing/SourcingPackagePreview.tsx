"use client";

import { ProductMockup } from "@/components/product-visuals/ProductMockup";
import type { PackageDesign, ProductArtwork } from "@/lib/sourcing/types";

export function SourcingPackagePreview({
  workspaceId,
  design,
  artwork,
  onOpen,
}: {
  workspaceId: string;
  design: PackageDesign;
  artwork: ProductArtwork | null;
  onOpen: () => void;
}) {
  const artworkApplied = Boolean(artwork && design.artworkId === artwork.id);
  const artworkUrl = artworkApplied && artwork
    ? `/api/sourcing/${workspaceId}/artwork/${artwork.id}`
    : undefined;

  return (
    <button
      type="button"
      className="package-direction-preview"
      aria-label="Refine saved package direction in 3D"
      aria-haspopup="dialog"
      onClick={onOpen}
      data-packaging-type={design.packagingType}
      data-base-color={design.baseColor.toLowerCase()}
      data-artwork-state={artworkApplied ? "applied" : artwork ? "unplaced" : "none"}
    >
      <ProductMockup
        packagingType={design.packagingType}
        logoUrl={artworkUrl}
        logoAspect={design.logoAspect}
        baseColor={design.baseColor}
        labelColor={design.labelColor}
        bottleFinish={design.finish}
        logoScale={design.logoScale}
        logoPosition={design.logoPosition}
        frontText={design.frontText}
        windowScale={design.windowScale}
        variant="thumbnail"
      />
    </button>
  );
}
