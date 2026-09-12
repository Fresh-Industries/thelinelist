import type { OperationType, Plant } from "./types";

export type DirectoryHelp = "production" | "kitchen";
export const DIRECTORY_HELP_LABELS = { production: "Someone to manufacture it", kitchen: "A kitchen to make it myself" } as const;
const PRODUCTION_MODELS = new Set<OperationType>(["co-packer", "co-manufacturer", "contract-manufacturer", "private-label-producer", "brand-with-co-pack"]);

export function matchesDirectoryHelp(plant: Plant, help: DirectoryHelp): boolean {
  if (help === "kitchen") return plant.operationType === "shared-kitchen-incubator";
  return Boolean(plant.operationType && PRODUCTION_MODELS.has(plant.operationType));
}
