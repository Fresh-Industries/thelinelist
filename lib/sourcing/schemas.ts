import { z } from "zod";
import { SOURCING_FIELD_KEYS } from "./types";

export const workspaceIdSchema = z.string().min(20).max(64).regex(/^[A-Za-z0-9_-]+$/);
export const fieldKeySchema = z.enum(SOURCING_FIELD_KEYS);
export const fieldStatusSchema = z.enum(["confirmed", "proposed", "unknown", "needs_decision", "rejected"]);

export const agentUpdateSchema = z.object({
  revision: z.number().int().positive().optional(),
  proposedUpdates: z.array(z.object({
    key: fieldKeySchema,
    value: z.string().trim().max(4_000).nullable(),
    reason: z.string().trim().max(1_000).optional(),
    source: z.string().trim().max(500).optional(),
    explicitlyStated: z.boolean(),
    suggestedSharing: z.boolean().optional(),
  })).min(1).max(26),
});

export const founderUpdateSchema = z.object({
  revision: z.number().int().positive().optional(),
  fieldUpdate: z.object({
    key: fieldKeySchema,
    value: z.string().trim().max(4_000).nullable(),
    status: fieldStatusSchema,
    shareWithManufacturer: z.boolean().optional(),
  }),
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
  proposedSharedFields: z.array(fieldKeySchema).max(26).optional(),
});

export const editDraftSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(12_000),
  includedFieldKeys: z.array(fieldKeySchema).max(22),
});

export const sendInquirySchema = z.object({
  outreachDraftId: z.string().uuid(),
  approvedContentVersion: z.number().int().positive(),
});
