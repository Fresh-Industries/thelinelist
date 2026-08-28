import { z } from "zod";
import { SOURCING_FIELD_KEYS, type SourcingWorkspace } from "./types";

const nullableText = z.string().max(20_000).nullable();
const dateText = z.string().datetime();
const actorSchema = z.enum(["founder", "agent", "system"]);
const fieldStatusSchema = z.enum(["confirmed", "proposed", "unknown", "needs_decision", "rejected"]);

const evidenceSchema = z.object({
  title: z.string().max(500),
  url: z.url().max(2_000),
  claim: z.string().max(2_000),
  publisher: z.string().max(500).nullable(),
  reviewedAt: dateText,
});

const sourcingFieldSchema = z.object({
  key: z.enum(SOURCING_FIELD_KEYS),
  value: nullableText,
  status: fieldStatusSchema,
  reason: nullableText,
  source: nullableText,
  explicitlyStated: z.boolean(),
  shareWithManufacturer: z.boolean(),
  updatedAt: dateText,
  updatedBy: actorSchema,
  evidence: z.array(evidenceSchema).max(20).optional(),
});

const matchEvidenceSchema = z.object({
  requirementKey: z.enum(SOURCING_FIELD_KEYS),
  requirementLabel: z.string().max(300),
  claim: z.string().max(2_000),
  status: z.enum(["verified", "publicly_listed", "unknown", "not_publicly_listed", "conflicting"]),
  sourceType: z.enum(["company_published", "directory_reported", "mixed_public_sources"]),
  sourceUrl: z.url().max(2_000).nullable(),
  sourceLabel: z.string().max(500).nullable(),
  lastReviewed: z.string().max(100),
  confidence: z.number().min(0).max(100).nullable(),
  notes: nullableText,
});

const manufacturerMatchSchema = z.object({
  manufacturerSlug: z.string().min(1).max(200),
  manufacturerName: z.string().min(1).max(500),
  location: z.string().max(500),
  fitExplanation: z.string().max(4_000),
  supportedMatches: z.array(z.string().max(1_000)).max(50),
  possibleConflicts: z.array(z.string().max(1_000)).max(50),
  unknowns: z.array(z.string().max(1_000)).max(50),
  evidence: z.array(matchEvidenceSchema).max(100),
  requirementsUsed: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
  introductionAvailable: z.boolean(),
  deliveryMethod: z.enum(["line_list_introduction", "external_contact_only", "paused"]),
  lastReviewed: z.string().max(100),
});

const packetSchema = z.object({
  token: z.string().min(16).max(500),
  manufacturerSlug: z.string().min(1).max(200),
  manufacturerName: z.string().min(1).max(500),
  includedFieldKeys: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
  fieldValues: z.partialRecord(z.enum(SOURCING_FIELD_KEYS), z.string().max(20_000)),
  questions: z.array(z.string().max(2_000)).max(30),
  createdAt: dateText,
  expiresAt: dateText,
  revokedAt: dateText.nullable(),
});

const outreachDraftSchema = z.object({
  id: z.string().min(1).max(500),
  manufacturerSlug: z.string().min(1).max(200),
  manufacturerName: z.string().min(1).max(500),
  subject: z.string().max(500),
  body: z.string().max(20_000),
  questions: z.array(z.string().max(2_000)).max(30),
  includedFieldKeys: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
  excludedFieldKeys: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
  warnings: z.array(z.string().max(2_000)).max(30),
  packet: packetSchema,
  availableDeliveryMethod: z.enum(["line_list_introduction", "safe_demo_email", "not_configured"]),
  demoRecipient: z.string().email().nullable(),
  recipientEmail: z.string().email().nullable().optional(),
  founderCopyEmail: z.string().email().nullable().optional(),
  version: z.number().int().positive(),
  approvedVersion: z.number().int().positive().nullable(),
  approvedAt: dateText.nullable(),
  sentAt: dateText.nullable(),
  deliveryStatus: z.enum(["draft", "approved", "sent", "failed"]),
  deliveryError: nullableText,
  humanSendTokenHash: nullableText.optional(),
  humanSendTokenExpiresAt: dateText.nullable().optional(),
  createdAt: dateText,
  updatedAt: dateText,
});

const inquirySchema = z.object({
  draftId: z.string().min(1).max(500),
  manufacturerSlug: z.string().min(1).max(200),
  manufacturerName: z.string().min(1).max(500),
  status: z.literal("contacted"),
  contactedAt: dateText,
  deliveryMethod: z.enum(["line_list_introduction", "safe_demo_email"]),
  deliveredTo: z.string().max(500).optional(),
  founderCopied: z.string().max(500).nullable().optional(),
});

export const PackageDesignSchema = z.object({
  packagingType: z.enum(["slim-can", "bottle", "jar", "stand-up-pouch"]),
  finish: z.enum(["colored", "clear"]),
  baseColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  labelColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  artworkId: z.string().min(1).max(500).nullable().default(null),
  logoAspect: z.number().min(0.25).max(4).default(1345 / 662),
  logoScale: z.number().min(0.05).max(3),
  logoPosition: z.object({ x: z.number().min(-2).max(2), y: z.number().min(-2).max(2) }),
  dimensions: z.object({
    width: z.number().positive().max(10_000).nullable(),
    height: z.number().positive().max(10_000).nullable(),
    depth: z.number().positive().max(10_000).nullable(),
  }),
  summary: z.string().max(1_000),
});

const productPlanV2Schema = z.object({
  schemaVersion: z.literal(2),
  originalIdea: nullableText,
  artwork: z.object({
    id: z.string().min(1).max(500),
    fileName: z.string().min(1).max(500),
    contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    byteSize: z.number().int().positive().max(8 * 1024 * 1024),
    createdAt: dateText,
  }).nullable(),
  packageDesign: PackageDesignSchema.nullable(),
  fields: z.record(z.enum(SOURCING_FIELD_KEYS), sourcingFieldSchema),
  selectedManufacturerSlugs: z.array(z.string().min(1).max(200)).max(3),
  matches: z.array(manufacturerMatchSchema).max(25),
  matchesUpdatedAt: dateText.nullable(),
  outreachDrafts: z.array(outreachDraftSchema).max(12),
  inquiries: z.array(inquirySchema).max(50),
});

export const ProductPlanSchema = z.preprocess(migrateProductPlan, productPlanV2Schema);

export type ProductPlan = z.infer<typeof ProductPlanSchema>;

export function productPlanFromWorkspace(workspace: SourcingWorkspace): ProductPlan {
  return ProductPlanSchema.parse({
    schemaVersion: 2,
    originalIdea: workspace.originalIdea,
    artwork: workspace.artwork,
    packageDesign: workspace.packageDesign,
    fields: workspace.fields,
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs,
    matches: workspace.matches,
    matchesUpdatedAt: workspace.matchesUpdatedAt,
    outreachDrafts: workspace.outreachDrafts,
    inquiries: workspace.inquiries,
  });
}

function migrateProductPlan(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const plan = input as Record<string, unknown>;
  const rawFields = plan.fields && typeof plan.fields === "object" && !Array.isArray(plan.fields)
    ? plan.fields as Record<string, unknown>
    : {};
  const productField = readLegacyField(rawFields.product_type);
  const descriptionField = readLegacyField(rawFields.product_description);
  const timestamp = productField?.updatedAt || descriptionField?.updatedAt || new Date(0).toISOString();
  const originalIdea = typeof plan.originalIdea === "string"
    ? plan.originalIdea
    : [descriptionField, productField].find((field) => field?.source === "Founder starting idea" && field.value)?.value ?? null;

  return {
    ...plan,
    schemaVersion: 2,
    originalIdea,
    fields: {
      ...rawFields,
      brand_name: rawFields.brand_name ?? {
        key: "brand_name",
        value: null,
        status: "unknown",
        reason: null,
        source: null,
        explicitlyStated: false,
        shareWithManufacturer: false,
        updatedAt: timestamp,
        updatedBy: "system",
        evidence: [],
      },
    },
  };
}

function readLegacyField(value: unknown): { value: string | null; source: string | null; updatedAt: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const field = value as Record<string, unknown>;
  return {
    value: typeof field.value === "string" ? field.value : null,
    source: typeof field.source === "string" ? field.source : null,
    updatedAt: typeof field.updatedAt === "string" ? field.updatedAt : new Date(0).toISOString(),
  };
}
