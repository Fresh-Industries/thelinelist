import { formatLastVerified, formatProcesses } from "./format";
import { packagingSummaryLabels } from "./packaging";
import type { Plant } from "./types";

const MOQ_UNITS: Record<string, string> = {
  unit: "units", units: "units",
  bottle: "bottles", bottles: "bottles",
  gallon: "gallons", gallons: "gallons", gal: "gallons",
  liter: "liters", liters: "liters", litre: "liters", litres: "liters",
  pound: "pounds", pounds: "pounds", lb: "pounds", lbs: "pounds",
  case: "cases", cases: "cases",
  pallet: "pallets", pallets: "pallets",
  pouch: "pouches", pouches: "pouches",
  packet: "packets", packets: "packets",
  pod: "pods", pods: "pods",
};

export interface CategorySnapshot {
  matchingManufacturers: number;
  publishingMinimums: number;
  comparableMoqRange: string | null;
  commonProcesses: string[];
  commonPackaging: string[];
  states: string[];
  lastReviewed: string;
}

function topValues(values: string[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, limit).map(([value]) => value);
}

export function comparableMoq(value: string | null): { amount: number; unit: string } | null {
  if (
    !value
    || /[~≈]|\b(?:about|roughly|approximately)\b|\bunpublished\b|\bnot (?:published|stated)\b|\bno (?:per-SKU unit MOQ|minimums?|numeric)\b|exact (?:units?|MOQ)|minimums? vary|run range|projects? start at \$/i.test(value)
    || /\b(?:per|\/)\s*(?:day|year|hour|week|month)\b/i.test(value)
    || /[\d,.]+\s*(?:-|–|—|to)\s*[\d,.]+/i.test(value)
  ) return null;
  const hasMinimumIntent = /\b(?:minimum|MOQ|as low as|as small as|starting at|starts? at|per (?:run|SKU|flavor)|runs?|batch)\b|\d\s*\+/i.test(value);
  if (!hasMinimumIntent) return null;
  const matches = [...value.matchAll(/([\d,.]+)\s*(K)?\s*(units?|bottles?|gallons?|gal|lit(?:er|re)s?|pounds?|lbs?|pallets?|cases?|pouches?|packets?|pods?)\b/gi)];
  if (matches.length !== 1) return null;
  const amount = Number(matches[0][1].replace(/,/g, "")) * (matches[0][2] ? 1_000 : 1);
  const unit = MOQ_UNITS[matches[0][3].toLowerCase()];
  return Number.isFinite(amount) && amount > 0 && unit ? { amount, unit } : null;
}

export function categorySnapshot(plants: Plant[]): CategorySnapshot {
  const comparable = plants.flatMap((plant) => {
    const parsed = comparableMoq(plant.moqDisplay);
    return parsed ? [parsed] : [];
  });
  const byUnit = new Map<string, number[]>();
  for (const item of comparable) byUnit.set(item.unit, [...(byUnit.get(item.unit) ?? []), item.amount]);
  const comparableGroup = [...byUnit]
    .filter(([, amounts]) => amounts.length >= 2)
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))[0];
  const comparableMoqRange = comparableGroup
    ? `${Math.min(...comparableGroup[1]).toLocaleString("en-US")}–${Math.max(...comparableGroup[1]).toLocaleString("en-US")} ${comparableGroup[0]}`
    : null;
  const lastReviewedIso = [...plants].map((plant) => plant.lastVerified).sort().at(-1);

  return {
    matchingManufacturers: plants.length,
    publishingMinimums: comparableGroup?.[1].length ?? 0,
    comparableMoqRange,
    commonProcesses: topValues(plants.flatMap((plant) => formatProcesses(plant))),
    commonPackaging: topValues(plants.flatMap((plant) => packagingSummaryLabels(plant.packaging))),
    states: [...new Set(plants.flatMap((plant) => plant.sites.map((site) => site.state)))].sort(),
    lastReviewed: lastReviewedIso ? formatLastVerified(lastReviewedIso) : "No matching listings reviewed yet",
  };
}
