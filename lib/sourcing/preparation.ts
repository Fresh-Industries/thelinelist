import { z } from "zod";

export const FOUNDER_STAGES = [
  { value: "idea", label: "Just an idea", description: "Figure out who it is for and what to test first.", guide: "/guides/test-food-business-idea" },
  { value: "testing", label: "Testing a recipe", description: "Understand development, packaging, and the help you need.", guide: "/guides/food-product-development" },
  { value: "ready", label: "Ready to find a manufacturer", description: "Prepare a useful brief and compare possible fits.", guide: "/guides/manufacturer-inquiry-examples" },
] as const;

export const founderStageSchema = z.enum(["idea", "testing", "ready"]);
export type FounderStage = z.infer<typeof founderStageSchema>;

export const COST_ITEMS = [
  { key: "ingredients", label: "Ingredients", basis: "unit", hint: "The ingredient cost for one finished unit." },
  { key: "packaging", label: "Packaging", basis: "unit", hint: "Container, closure, label, and your share of the shipping case." },
  { key: "manufacturing", label: "Manufacturing", basis: "unit", hint: "Processing and packing fees. Check whether ingredients or packaging are already included." },
  { key: "setup", label: "Development, testing, and setup", basis: "run", hint: "Costs assigned to this run, including any trial or changeover fees." },
  { key: "freight", label: "Freight", basis: "run", hint: "Transport included in this estimate. Confirm which shipment legs the quote covers." },
  { key: "storage", label: "Storage", basis: "run", hint: "Storage for the period you are planning. Record that period in your notes." },
  { key: "other", label: "Other run costs", basis: "run", hint: "Any additional run costs, such as handling or expected unused materials." },
] as const;

export type CostItemKey = (typeof COST_ITEMS)[number]["key"];
const amountSchema = z.number().finite().min(0).max(1_000_000_000).nullable();
export const costWorksheetSchema = z.object({
  quantity: z.number().int().positive().max(100_000_000).nullable(),
  unitLabel: z.string().trim().min(1).max(60),
  ingredients: amountSchema,
  packaging: amountSchema,
  manufacturing: amountSchema,
  setup: amountSchema,
  freight: amountSchema,
  storage: amountSchema,
  other: amountSchema,
  sellingPrice: amountSchema,
  notes: z.string().trim().max(2_000),
}).strict().refine((value) => {
  if (value.quantity === null) return true;
  const units = (value.ingredients ?? 0) + (value.packaging ?? 0) + (value.manufacturing ?? 0);
  const run = (value.setup ?? 0) + (value.freight ?? 0) + (value.storage ?? 0) + (value.other ?? 0);
  return units * value.quantity + run <= Number.MAX_SAFE_INTEGER / 100;
}, "Use an estimate small enough to calculate accurately in cents.");
export type CostWorksheet = z.infer<typeof costWorksheetSchema>;

export function emptyCostWorksheet(): CostWorksheet {
  return { quantity: null, unitLabel: "unit", ingredients: null, packaging: null, manufacturing: null, setup: null, freight: null, storage: null, other: null, sellingPrice: null, notes: "" };
}

export const preparationSchema = z.object({
  stage: founderStageSchema.nullable().default(null),
  checklists: z.record(z.string().regex(/^[a-z0-9-]{1,100}$/), z.array(z.string().regex(/^item-[a-z0-9]+$/)).max(40)).refine((value) => Object.keys(value).length <= 80).default({}),
  costWorksheet: costWorksheetSchema.nullable().default(null),
}).strict();
export type FounderPreparation = z.infer<typeof preparationSchema>;
export function emptyPreparation(): FounderPreparation {
  return { stage: null, checklists: {}, costWorksheet: null };
}

export const preparationUpdateSchema = z.object({
  revision: z.number().int().positive(),
  preparationUpdate: z.union([
    z.object({ stage: founderStageSchema.nullable() }).strict(),
    z.object({ checklist: z.object({ guideSlug: z.string().regex(/^[a-z0-9-]{1,100}$/), completedItemIds: z.array(z.string().regex(/^item-[a-z0-9]+$/)).max(40) }).strict() }).strict(),
    z.object({ costWorksheet: costWorksheetSchema }).strict(),
  ]),
}).strict();
export type PreparationUpdate = z.infer<typeof preparationUpdateSchema>["preparationUpdate"];

/** Content-derived identifiers do not transfer completion to a rewritten checklist item. */
export function checklistItemId(text: string): string {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `item-${(hash >>> 0).toString(36)}`;
}

export function calculateRunCosts(input: CostWorksheet) {
  const missing = COST_ITEMS.filter((item) => input[item.key] === null).map((item) => item.label);
  const hasCosts = COST_ITEMS.some((item) => input[item.key] !== null);
  const perUnit = COST_ITEMS.filter((item) => item.basis === "unit").reduce((sum, item) => sum + (input[item.key] ?? 0), 0);
  const perRun = COST_ITEMS.filter((item) => item.basis === "run").reduce((sum, item) => sum + (input[item.key] ?? 0), 0);
  // A blank quantity must never be treated as one unit or a zero-sized production run.
  const subtotal = input.quantity && hasCosts ? Math.round((perUnit * input.quantity + perRun) * 100) / 100 : null;
  const unitCost = subtotal !== null && input.quantity ? subtotal / input.quantity : null;
  const complete = missing.length === 0 && unitCost !== null;
  const amountLeft = complete && input.sellingPrice !== null ? input.sellingPrice - unitCost : null;
  return { missing, hasCosts, subtotal, unitCost, complete, amountLeft };
}
