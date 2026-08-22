import { processLabel, productLabel } from "./labels";
import type { Plant } from "./types";

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

export function formatLastVerified(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
