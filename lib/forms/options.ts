import type { FinderProcess, FinderProduct } from "@/lib/directory";

/** Existing finder product tags plus Not sure. Not a new plant capability enum. */
export const INTRO_CATEGORY_OPTIONS: { value: FinderProduct | "unsure"; label: string }[] = [
  { value: "beverage", label: "Beverage" },
  { value: "sauce", label: "Sauce / condiment" },
  { value: "prepared-rte", label: "Prepared / refrigerated RTE" },
  { value: "unsure", label: "Not sure" },
];

/** Existing published finder processes plus Not sure. */
export const INTRO_PROCESS_OPTIONS: { value: FinderProcess | "unsure"; label: string }[] = [
  { value: "hpp", label: "HPP" },
  { value: "hot-fill", label: "Hot fill" },
  { value: "retort", label: "Retort" },
  { value: "unsure", label: "Not sure" },
];

/** Packaging formats (SKU pack types), not plant capabilities. */
export const PACKAGING_FORMAT_OPTIONS = [
  { value: "bottle", label: "Bottle" },
  { value: "jar", label: "Jar" },
  { value: "can", label: "Can" },
  { value: "pouch", label: "Pouch" },
  { value: "cup", label: "Cup" },
  { value: "other", label: "Other" },
] as const;

export type PackagingFormat = (typeof PACKAGING_FORMAT_OPTIONS)[number]["value"];

export const FOUNDER_STAGE_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "formula", label: "Formula" },
  { value: "first-run", label: "First run" },
  { value: "scaling", label: "Scaling" },
] as const;

export type FounderStage = (typeof FOUNDER_STAGE_OPTIONS)[number]["value"];

export const MOQ_READY_OPTIONS = [
  { value: "yes", label: "Yes, we can fund a published floor" },
  { value: "not-yet", label: "Not yet" },
  { value: "unsure", label: "Unsure" },
] as const;

export type MoqReady = (typeof MOQ_READY_OPTIONS)[number]["value"];

export const FORMULA_STATUS_OPTIONS = [
  { value: "", label: "Select (optional)" },
  { value: "idea-only", label: "Idea only" },
  { value: "working-formula", label: "Working formula" },
  { value: "locked-recipe", label: "Locked recipe" },
  { value: "unsure", label: "Not sure" },
] as const;

export const SPECS_READY_OPTIONS = [
  { value: "", label: "Select (optional)" },
  { value: "yes", label: "Yes" },
  { value: "in-progress", label: "In progress" },
  { value: "no", label: "No" },
] as const;

export const ACIDIFIED_OPTIONS = [
  { value: "", label: "Select (optional)" },
  { value: "high-acid", label: "High-acid" },
  { value: "acidified", label: "Acidified" },
  { value: "low-acid-lacf", label: "Low-acid (LACF)" },
  { value: "not-applicable", label: "Not applicable" },
  { value: "unsure", label: "Not sure" },
] as const;

export const NDA_OPTIONS = [
  { value: "", label: "Select (optional)" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "discuss", label: "Discuss" },
] as const;

export const US_STATE_OPTIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;
