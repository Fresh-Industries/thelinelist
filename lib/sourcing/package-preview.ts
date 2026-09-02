import { packageConfigs } from "@/components/product-visuals/package-config";
import { formatPackageDirection } from "./package-presentation";
import type { PackageDesign, PackageDesignPreviewInput, SourcingWorkspace } from "./types";

export function mergePackagePreview(workspace: SourcingWorkspace, patch: PackageDesignPreviewInput, stagedPreview: PackageDesign | null = null): PackageDesign {
  const inferredType: PackageDesign["packagingType"] = /jar/i.test(workspace.fields.packaging_format.value || "")
    ? "jar"
    : /bottle/i.test(workspace.fields.packaging_format.value || "")
      ? "bottle"
      : /bakery|bread|loaf/i.test(`${workspace.fields.packaging_format.value || ""} ${workspace.fields.product_description.value || ""}`)
        ? "bakery-bag"
        : /pouch|bag/i.test(`${workspace.fields.packaging_format.value || ""} ${workspace.fields.product_description.value || ""}`)
          ? "stand-up-pouch"
          : "slim-can";
  const defaultFrontText = {
    brand: workspace.fields.brand_name.value ?? "",
    product: workspace.fields.product_type.value ?? workspace.fields.product_name.value ?? "",
  };
  const base = stagedPreview ?? workspace.packageDesign ?? {
    packagingType: inferredType,
    finish: "colored" as const,
    baseColor: inferredType === "bakery-bag" ? "#b98a5f" : "#b64d2c",
    labelColor: "#f2e8d5",
    artworkId: workspace.artwork?.id ?? null,
    previewAssetId: null,
    frontText: inferredType === "bakery-bag" ? defaultFrontText : null,
    windowScale: inferredType === "bakery-bag" ? 0.72 : 0,
    closure: null,
    logoAspect: 1345 / 662,
    logoScale: packageConfigs[inferredType].logo.defaultScale,
    logoPosition: { x: 0, y: 0 },
    dimensions: { width: null, height: null, depth: null },
    summary: formatPackageDirection(inferredType, { width: null, height: null, depth: null }),
    placeholder: true,
    source: "system_defaults" as const,
  };
  const explicitVisualDirection = patch.finish !== undefined
    || patch.baseColor !== undefined
    || patch.labelColor !== undefined
    || patch.artworkId != null
    || patch.frontText != null
    || patch.windowScale !== undefined
    || patch.closure != null
    || patch.logoAspect !== undefined
    || patch.logoScale !== undefined
    || patch.logoPosition !== undefined;
  const packagingType = patch.packagingType ?? base.packagingType;
  const packagingTypeChanged = packagingType !== base.packagingType;
  const config = packageConfigs[packagingType];
  const dimensions = { ...base.dimensions, ...patch.dimensions };
  const requestedLogoPosition = { ...base.logoPosition, ...patch.logoPosition };
  const requestedWindowScale = patch.windowScale === undefined
    ? packagingType === "bakery-bag" ? packagingTypeChanged ? 0.72 : base.windowScale : 0
    : patch.windowScale;
  const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
  return {
    ...base,
    ...patch,
    packagingType,
    finish: config.appearance.supportsClearFinish ? patch.finish ?? base.finish : "colored",
    baseColor: patch.baseColor ?? (packagingTypeChanged && packagingType === "bakery-bag" ? "#b98a5f" : base.baseColor),
    frontText: patch.frontText === undefined
      ? packagingType === "bakery-bag" ? base.frontText ?? defaultFrontText : null
      : patch.frontText,
    windowScale: config.window ? clamp(requestedWindowScale, config.window.scale.min, config.window.scale.max) : 0,
    closure: patch.closure === undefined ? base.closure : patch.closure,
    logoScale: clamp(patch.logoScale ?? base.logoScale, config.logo.scale.min, config.logo.scale.max),
    logoPosition: {
      x: clamp(requestedLogoPosition.x, config.logo.horizontal.min, config.logo.horizontal.max),
      y: clamp(requestedLogoPosition.y, config.logo.vertical.min, config.logo.vertical.max),
    },
    dimensions,
    summary: patch.summary || formatPackageDirection(packagingType, dimensions),
    placeholder: patch.placeholder ?? (explicitVisualDirection ? false : base.placeholder),
    source: patch.source ?? (explicitVisualDirection ? "agent_direction" : base.source),
  };
}
