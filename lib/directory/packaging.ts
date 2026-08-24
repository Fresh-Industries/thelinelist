import type { PackagingFilter } from "./types";

const PACKAGING_PATTERNS: Record<PackagingFilter, RegExp> = {
  can: /\b(can|cans|canning|aluminum)\b/i,
  bottle: /\b(bottle|bottles|bottling|PET|HDPE)\b/i,
  jar: /\b(jar|jars)\b/i,
  pouch: /\b(pouch|pouches|sachet|sachets|bag|bags|stick pack)\b/i,
  other: /\b(cup|cups|tub|tubs|tray|trays|carton|cartons|drum|drums|tote|totes|pail|pails)\b/i,
};

/**
 * Match only explicitly named package formats. Material alone (for example,
 * "glass") is not enough to infer a jar, and explicitly negated formats do
 * not count as support.
 */
export function hasPackagingFormat(packaging: string | null, format: PackagingFilter): boolean {
  if (!packaging) return false;
  const positiveSegments = packaging
    .split(/[;.]/)
    .filter((segment) => !/^\s*(?:no|not|without)\b/i.test(segment));
  return positiveSegments.some((segment) => PACKAGING_PATTERNS[format].test(segment));
}

export function packagingSummaryLabels(packaging: string | null): string[] {
  const labels: Array<[PackagingFilter, string]> = [
    ["bottle", "bottles"],
    ["can", "cans"],
    ["jar", "jars"],
    ["pouch", "pouches"],
    ["other", "other disclosed formats"],
  ];
  return labels.filter(([format]) => hasPackagingFormat(packaging, format)).map(([, label]) => label);
}
