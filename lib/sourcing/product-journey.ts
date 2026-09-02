import type { SourcingWorkspace } from "./types";
import { getCurrentManufacturerResearch, hasValidFounderPackageCommit } from "./workspace";

export type ProductJourneyKey = "idea" | "product" | "packaging" | "production" | "manufacturer";
export type ProductJourneyStatus = "complete" | "current" | "future";

export interface ProductJourneyStep {
  key: ProductJourneyKey;
  label: string;
  status: ProductJourneyStatus;
}

function confirmed(workspace: SourcingWorkspace, key: keyof SourcingWorkspace["fields"]): boolean {
  const field = workspace.fields[key];
  return field.status === "confirmed" && Boolean(field.value) && !/not sure/i.test(field.value ?? "");
}

export function getProductJourney(workspace: SourcingWorkspace): ProductJourneyStep[] {
  const ideaComplete = confirmed(workspace, "product_type");
  const productComplete = ideaComplete && (confirmed(workspace, "product_format") || confirmed(workspace, "product_description"));
  const packagingComplete = confirmed(workspace, "packaging_format") && hasValidFounderPackageCommit(workspace);
  const productionComplete = packagingComplete
    && confirmed(workspace, "production_volume")
    && confirmed(workspace, "storage_distribution")
    && (confirmed(workspace, "formula_status") || confirmed(workspace, "formulation_assistance"));
  const manufacturerComplete = Boolean(getCurrentManufacturerResearch(workspace)?.candidateCount);
  const completed = [ideaComplete, productComplete, packagingComplete, productionComplete, manufacturerComplete];
  const currentIndex = Math.min(completed.findIndex((value) => !value), completed.length - 1);
  const steps: Array<{ key: ProductJourneyKey; label: string }> = [
    { key: "idea", label: "Idea" },
    { key: "product", label: "Product" },
    { key: "packaging", label: "Packaging" },
    { key: "production", label: "Production" },
    { key: "manufacturer", label: "Manufacturer" },
  ];

  return steps.map((step, index) => ({
    ...step,
    status: completed[index] ? "complete" : index === currentIndex ? "current" : "future",
  }));
}
