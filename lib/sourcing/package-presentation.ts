import type { PackageDesign, ProductArtwork } from "./types";

const PACKAGE_LABELS: Record<PackageDesign["packagingType"], string> = {
  "slim-can": "Slim can",
  bottle: "Bottle",
  jar: "Jar",
  "stand-up-pouch": "Bag / pouch",
  "bakery-bag": "Kraft-style bakery bag",
};

const NAMED_PACKAGE_COLORS = [
  { hex: "#ccaef9", name: "Lavender" },
  { hex: "#b64d2c", name: "Terracotta" },
  { hex: "#25b7b8", name: "Aqua" },
  { hex: "#ef5a47", name: "Coral" },
  { hex: "#f3a51f", name: "Mango" },
  { hex: "#7559c8", name: "Purple" },
  { hex: "#2f754c", name: "Forest green" },
  { hex: "#f2e8d5", name: "Cream" },
] as const;

const MAX_NAMED_COLOR_DISTANCE = 48;

export interface PackageDesignPresentation {
  direction: string;
  appearance: string;
  validation: string;
}

export function getPackageDesignPresentation(
  design: PackageDesign,
  artwork: ProductArtwork | null,
): PackageDesignPresentation {
  const color = design.finish === "clear" ? "Clear finish" : getPackageColorName(design.baseColor);
  const artworkText = design.frontText?.brand || design.frontText?.product
    ? `front copy set${design.frontText.brand ? ` for ${design.frontText.brand}` : ""}`
    : artwork
    ? design.artworkId === artwork.id
      ? "custom artwork added"
      : "artwork added · placement still open"
    : "artwork not added";
  const windowText = design.packagingType === "bakery-bag" && design.windowScale > 0
    ? "clear viewing window"
    : null;

  return {
    direction: formatPackageDirection(design.packagingType, design.dimensions),
    appearance: [color, windowText, artworkText].filter(Boolean).join(" · "),
    validation: "Mockup for planning; final packaging requires manufacturer validation.",
  };
}

export function formatPackageDirection(
  packagingType: PackageDesign["packagingType"],
  dimensions: PackageDesign["dimensions"],
): string {
  const values = [dimensions.width, dimensions.height];
  if (dimensions.depth) values.push(dimensions.depth);
  const hasWorkingDimensions = values.length >= 2 && values.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
  const dimensionText = hasWorkingDimensions ? `${values.join(" × ")} working dimensions` : "dimensions still open";

  return `${PACKAGE_LABELS[packagingType]} · ${dimensionText}`;
}

export function getPackageColorName(value: string): string {
  const rgb = parseHexColor(value);
  if (!rgb) return "Custom color";

  let closest: { name: string; distance: number } | null = null;
  for (const candidate of NAMED_PACKAGE_COLORS) {
    const candidateRgb = parseHexColor(candidate.hex);
    if (!candidateRgb) continue;
    const distance = Math.sqrt(
      (rgb.red - candidateRgb.red) ** 2
      + (rgb.green - candidateRgb.green) ** 2
      + (rgb.blue - candidateRgb.blue) ** 2,
    );
    if (!closest || distance < closest.distance) closest = { name: candidate.name, distance };
  }

  return closest && closest.distance <= MAX_NAMED_COLOR_DISTANCE ? closest.name : "Custom color";
}

function parseHexColor(value: string): { red: number; green: number; blue: number } | null {
  const match = /^#?([\da-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const numeric = Number.parseInt(match[1], 16);
  return {
    red: (numeric >> 16) & 255,
    green: (numeric >> 8) & 255,
    blue: numeric & 255,
  };
}
