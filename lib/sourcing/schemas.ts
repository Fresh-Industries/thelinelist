import { z } from "zod";
import { NEVER_SHARE_FIELD_KEYS } from "./fields";
import { SOURCING_FIELD_KEYS } from "./types";

export const workspaceIdSchema = z.string().min(20).max(64).regex(/^[A-Za-z0-9_-]+$/);
export const fieldKeySchema = z.enum(SOURCING_FIELD_KEYS);
export const fieldStatusSchema = z.enum(["confirmed", "proposed", "unknown", "needs_decision", "rejected"]);
export const contactEmailSchema = z.string().trim().email().max(320);
const publicHttpUrlSchema = z.string().url().max(2_000).refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, "Source URLs must use http or https.");
const MAX_SHAREABLE_FIELDS = SOURCING_FIELD_KEYS.length - NEVER_SHARE_FIELD_KEYS.size;

function validateContactEmail(
  update: { key: (typeof SOURCING_FIELD_KEYS)[number]; value: string | null; status?: string; explicitlyStated?: boolean },
  context: z.RefinementCtx,
) {
  const willBeConfirmed = update.status === "confirmed" || (update.status === undefined && update.explicitlyStated === true);
  if (update.key === "contact_email" && willBeConfirmed && !contactEmailSchema.safeParse(update.value).success) {
    context.addIssue({ code: "custom", message: "Enter a valid founder email address.", path: ["value"] });
  }
}

export const agentUpdateSchema = z.object({
  revision: z.number().int().positive().optional(),
  proposedUpdates: z.array(z.object({
    key: fieldKeySchema,
    value: z.string().trim().max(4_000).nullable(),
    reason: z.string().trim().max(1_000).optional(),
    source: z.string().trim().max(500).optional(),
    explicitlyStated: z.boolean().optional(),
    status: z.enum(["confirmed", "proposed", "needs_decision"]).optional(),
    suggestedSharing: z.boolean().optional(),
    sources: z.array(z.object({
      title: z.string().trim().min(1).max(300),
      url: publicHttpUrlSchema,
      claim: z.string().trim().min(1).max(1_000),
      publisher: z.string().trim().max(200).optional(),
      reviewedAt: z.string().datetime().optional(),
    })).max(8).optional(),
  }).refine((update) => update.explicitlyStated !== undefined || update.status !== undefined, {
    message: "Each update needs a decision status.",
  }).superRefine(validateContactEmail)).min(1).max(SOURCING_FIELD_KEYS.length),
});

export const founderUpdateSchema = z.object({
  revision: z.number().int().positive().optional(),
  fieldUpdate: z.object({
    key: fieldKeySchema,
    value: z.string().trim().max(4_000).nullable(),
    status: fieldStatusSchema,
    shareWithManufacturer: z.boolean().optional(),
  }).superRefine(validateContactEmail),
});

export const selectionUpdateSchema = z.object({
  revision: z.number().int().positive().optional(),
  selectedManufacturerSlugs: z.array(z.string().trim().min(1).max(120)).max(3),
});

export const matchRequestSchema = z.object({
  geographyPreference: z.string().trim().max(100).optional(),
  resultLimit: z.number().int().min(1).max(10).default(5),
  requiredRequirements: z.array(fieldKeySchema).max(15).optional(),
  preferredRequirements: z.array(fieldKeySchema).max(15).optional(),
});

export const prepareOutreachSchema = z.object({
  selectedManufacturerIds: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  founderInstructions: z.string().trim().max(2_000).optional(),
  proposedSharedFields: z.array(fieldKeySchema).max(MAX_SHAREABLE_FIELDS).optional(),
});

export const editDraftSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(12_000),
  includedFieldKeys: z.array(fieldKeySchema).max(MAX_SHAREABLE_FIELDS),
});

export const sendInquirySchema = z.object({
  outreachDraftId: z.string().uuid(),
  approvedContentVersion: z.number().int().positive(),
  humanSendToken: z.string().min(32).max(200),
  confirmation: z.literal("human_click"),
});
