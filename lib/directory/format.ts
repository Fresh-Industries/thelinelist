import { processLabel, productLabel } from "./labels";
import type { Plant } from "./types";

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const REVIEW_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatProcesses(plant: Plant): string[] {
  if (plant.processes.length === 0) return [];
  return plant.processes.map(processLabel);
}

export function formatProductTypes(plant: Plant): string[] {
  return plant.finderProducts.map(productLabel);
}

export function formatMoq(plant: Plant): string | null {
  return plant.moqDisplay;
}

export function formatPackaging(plant: Plant): string | null {
  return plant.packaging;
}

export function formatCardSnippet(value: string | null, max = 88): string | null {
  if (!value) return null;
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 40 ? space : max - 1)}…`;
}

export function formatLastVerified(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return REVIEW_DATE_FORMATTER.format(date);
}

export function formatVerifiedMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return REVIEW_MONTH_FORMATTER.format(date);
}
