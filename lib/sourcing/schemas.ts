import { z } from "zod";
import { NEVER_SHARE_FIELD_KEYS } from "./fields";
import { MATCHABLE_REQUIREMENT_KEYS } from "./matching-requirements";
import { SOURCING_FIELD_KEYS } from "./types";
import { PackageDesignSchema } from "./product-plan";

export const workspaceIdSchema = z.string().min(20).max(64).regex(/^[A-Za-z0-9_-]+$/);
export const fieldKeySchema = z.enum(SOURCING_FIELD_KEYS);
export const matchableRequirementKeySchema = z.enum(MATCHABLE_REQUIREMENT_KEYS);
export const fieldStatusSchema = z.enum(["confirmed", "proposed", "unknown", "needs_decision", "rejected"]);
export const contactEmailSchema = z.email().trim().max(320);
const publicHttpUrlSchema = z.url().max(2_000).refine((value) => {
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

export const agentFieldUpdateSchema = z.object({
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
      reviewedAt: z.iso.datetime().optional(),
    })).max(8).optional(),
  }).refine((update) => update.explicitlyStated !== undefined || update.status !== undefined, {
    message: "Each update needs a decision status.",
  }).superRefine((update, context) => {
    validateContactEmail(update, context);
    if (update.status === "confirmed" && update.explicitlyStated !== true) {
      context.addIssue({ code: "custom", message: "Confirmed values require an explicit founder statement.", path: ["explicitlyStated"] });
    }
  });

export const agentUpdateSchema = z.object({
  revision: z.number().int().positive().optional(),
  proposedUpdates: z.array(agentFieldUpdateSchema).min(1).max(SOURCING_FIELD_KEYS.length),
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

const opaqueMutationIdSchema = z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/);

export const packageDesignStageSchema = z.object({
  revision: z.number().int().positive(),
  stagePackageDesign: z.object({
    stageId: opaqueMutationIdSchema,
    packageDesign: PackageDesignSchema,
    stagedBy: z.enum(["agent", "founder"]),
  }),
});

export const packageDesignCommitSchema = z.object({
  revision: z.number().int().positive(),
  founderPackageCommit: z.object({
    commitId: opaqueMutationIdSchema,
    stagedPackageId: opaqueMutationIdSchema,
  }),
});

export const undoAgentChangeSchema = z.object({
  revision: z.number().int().positive(),
  undoAgentChangeId: z.string().min(1).max(500),
});

export const matchRequestSchema = z.object({
  geographyPreference: z.string().trim().max(100).optional(),
  resultLimit: z.number().int().min(1).max(3).default(3),
  requiredRequirements: z.array(matchableRequirementKeySchema).max(MATCHABLE_REQUIREMENT_KEYS.length).optional(),
  preferredRequirements: z.array(matchableRequirementKeySchema).max(MATCHABLE_REQUIREMENT_KEYS.length).optional(),
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
