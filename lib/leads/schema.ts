import { z } from "zod";
import {
  ACIDIFIED_OPTIONS,
  FOUNDER_STAGE_OPTIONS,
  FORMULA_STATUS_OPTIONS,
  INTRO_CATEGORY_OPTIONS,
  INTRO_PROCESS_OPTIONS,
  MOQ_READY_OPTIONS,
  NDA_OPTIONS,
  PACKAGING_FORMAT_OPTIONS,
  SPECS_READY_OPTIONS,
  US_STATE_OPTIONS,
} from "@/lib/forms/options";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

function valuesOf<T extends string>(options: readonly { value: T }[]): [T, ...T[]] {
  const values = options.map((option) => option.value);
  if (values.length === 0) {
    throw new Error("Option list cannot be empty.");
  }
  return values as [T, ...T[]];
}

export const introInputSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(120),
    email: z.string().trim().email("Enter a valid email.").max(200),
    phone: optionalText(40),
    company: optionalText(160),
    product: z.string().trim().min(1, "Tell us what you want to make.").max(200),
    category: z.enum(valuesOf(INTRO_CATEGORY_OPTIONS), {
      error: "Pick a product category, or Not sure.",
    }),
    process: z.enum(valuesOf(INTRO_PROCESS_OPTIONS), {
      error: "Pick a process we already publish, or Not sure.",
    }),
    processNeeds: z
      .string()
      .trim()
      .min(1, "Describe the process you need, even if you are not sure.")
      .max(500),
    packagingFormat: z.enum(valuesOf(PACKAGING_FORMAT_OPTIONS), {
      error: "Pick a packaging format.",
    }),
    packSize: z.string().trim().min(1, "Add a pack size or format note.").max(200),
    qty: z.string().trim().min(1, "Add a first-run volume or unit count.").max(200),
    moqReady: z.enum(valuesOf(MOQ_READY_OPTIONS), {
      error: "Tell us if you can fund a published floor.",
    }),
    launchDate: z.string().trim().min(1, "Add a needed-by date or timeframe.").max(80),
    location: optionalText(160),
    webSocial: optionalText(300),
    stage: z.enum(valuesOf(FOUNDER_STAGE_OPTIONS), {
      error: "Pick your stage.",
    }),
    details: optionalText(4000),
    certsNeeded: optionalText(400),
    certsRequired: z.enum(["yes", ""]).optional(),
    formulaStatus: z.enum(valuesOf(FORMULA_STATUS_OPTIONS)).optional(),
    specsReady: z.enum(valuesOf(SPECS_READY_OPTIONS)).optional(),
    allergens: optionalText(400),
    acidifiedStatus: z.enum(valuesOf(ACIDIFIED_OPTIONS)).optional(),
    budgetReadiness: optionalText(200),
    whoSupplies: optionalText(300),
    scaleUpGoals: optionalText(300),
    storagePlan: optionalText(300),
    nda: z.enum(valuesOf(NDA_OPTIONS)).optional(),
    manufacturerSlug: z.string().trim().min(1),
    manufacturerName: z.string().trim().min(1),
    sourceUrl: z.string().trim().min(1),
    startedAt: z.string().trim().min(1),
    hp: optionalText(120),
    utm_source: optionalText(200),
    utm_medium: optionalText(200),
    utm_campaign: optionalText(200),
    utm_content: optionalText(200),
    utm_term: optionalText(200),
  })
  .superRefine((value, ctx) => {
    if (value.certsRequired === "yes" && !value.certsNeeded?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["certsNeeded"],
        message: "List the certifications you need, or uncheck that you require them.",
      });
    }
  });

export type IntroInput = z.infer<typeof introInputSchema>;

export const claimInputSchema = z
  .object({
    manufacturerSlug: z.string().trim().min(1, "Pick a company."),
    manufacturerName: z.string().trim().min(1, "Enter the company or plant name.").max(200),
    city: z.string().trim().min(1, "Enter a city.").max(120),
    state: z.enum(US_STATE_OPTIONS, { error: "Pick a U.S. state." }),
    contactName: z.string().trim().min(1, "Enter a contact name.").max(120),
    workEmail: z.string().trim().email("Enter a work email.").max(200),
    phone: optionalText(40),
    role: z.string().trim().min(1, "Enter your role.").max(120),
    website: optionalText(300),
    notListed: z.enum(["yes", ""]).optional(),
    processTags: z.array(z.enum(["hpp", "hot-fill", "retort"])).optional(),
    productTags: z.array(z.enum(["beverage", "sauce", "prepared-rte"])).optional(),
    activityCorrections: optionalText(2000),
    corrections: optionalText(4000),
    featuredInterest: z.enum(["yes", ""]).optional(),
    message: optionalText(4000),
    street: optionalText(160),
    zip: optionalText(20),
    moqCorrection: optionalText(400),
    certsCorrection: optionalText(400),
    operationType: optionalText(200),
    reviewedNote: optionalText(400),
    sourceAttribution: optionalText(400),
    capacityNotes: optionalText(400),
    equipmentNotes: optionalText(400),
    whoBuys: optionalText(300),
    qcSummary: optionalText(400),
    productDev: optionalText(300),
    storage: optionalText(300),
    distribution: optionalText(300),
    aboutNotes: optionalText(4000),
    startedAt: z.string().trim().min(1),
    hp: optionalText(120),
    utm_source: optionalText(200),
    utm_medium: optionalText(200),
    utm_campaign: optionalText(200),
    utm_content: optionalText(200),
    utm_term: optionalText(200),
  })
  .superRefine((value, ctx) => {
    if (value.notListed === "yes" && !value.website?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["website"],
        message: "Add the public page we should read if you are not on the list yet.",
      });
    }
  });

export type ClaimInput = z.infer<typeof claimInputSchema>;

export const newsletterInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email.").max(200),
  startedAt: z.string().trim().min(1),
  hp: optionalText(120),
});

export type NewsletterInput = z.infer<typeof newsletterInputSchema>;

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    let message = issue.message;
    if (issue.code === "too_big" && issue.origin === "string") {
      message = `Keep this answer to ${issue.maximum} characters or fewer.`;
    }
    if (!fields[key]) fields[key] = message;
  }
  return fields;
}
