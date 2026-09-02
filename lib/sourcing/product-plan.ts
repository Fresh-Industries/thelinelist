import { z } from "zod";
import { SOURCING_FIELD_KEYS, type SourcingWorkspace } from "./types";

const nullableText = z.string().max(20_000).nullable();
const dateText = z.string().datetime();
const actorSchema = z.enum(["founder", "agent", "system"]);
const fieldStatusSchema = z.enum(["confirmed", "proposed", "unknown", "needs_decision", "rejected"]);
const validationStatusSchema = z.enum(["not_required", "needs_validation", "validated"]);
const confirmationSchema = z.object({
  id: z.string().min(1).max(500),
  actor: z.literal("founder"),
  channel: z.enum(["workspace_ui", "founder_statement", "legacy_import"]),
  confirmedAt: dateText,
  sourceRevision: z.number().int().nonnegative(),
});

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
  confirmation: confirmationSchema.nullable().default(null),
  validationStatus: validationStatusSchema.default("not_required"),
  evidence: z.array(evidenceSchema).max(20).optional(),
  sourceSpans: z.array(z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    text: z.string().max(1_500),
  })).max(20).optional(),
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
  packagingType: z.enum(["slim-can", "bottle", "jar", "stand-up-pouch", "bakery-bag"]),
  finish: z.enum(["colored", "clear"]),
  baseColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  labelColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  artworkId: z.string().min(1).max(500).nullable().default(null),
  previewAssetId: z.string().min(1).max(500).nullable().default(null),
  frontText: z.object({
    brand: z.string().trim().max(120),
    product: z.string().trim().max(160),
  }).nullable().default(null),
  windowScale: z.number().min(0).max(1).default(0),
  closure: z.object({
    style: z.string().trim().min(1).max(200),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable(),
  }).nullable().default(null),
  logoAspect: z.number().min(0.25).max(4).default(1345 / 662),
  logoScale: z.number().min(0.05).max(3),
  logoPosition: z.object({ x: z.number().min(-2).max(2), y: z.number().min(-2).max(2) }),
  dimensions: z.object({
    width: z.number().positive().max(10_000).nullable(),
    height: z.number().positive().max(10_000).nullable(),
    depth: z.number().positive().max(10_000).nullable(),
  }),
  summary: z.string().max(1_000),
  placeholder: z.boolean().default(false),
  source: z.enum(["system_defaults", "agent_direction", "founder_direction"]).default("founder_direction"),
}).superRefine((design, context) => {
  if (design.packagingType !== "bakery-bag") return;
  const checks = [
    { valid: design.finish === "colored", path: ["finish"], message: "The bakery-bag mockup supports only its opaque colored finish." },
    { valid: design.windowScale >= 0.35, path: ["windowScale"], message: "A bakery-bag viewing window must be between 0.35 and 1." },
    { valid: design.logoScale >= 0.48 && design.logoScale <= 1.2, path: ["logoScale"], message: "Bakery-bag front copy size must be between 0.48 and 1.2." },
    { valid: design.logoPosition.x >= -0.34 && design.logoPosition.x <= 0.34, path: ["logoPosition", "x"], message: "Bakery-bag front copy x position must be between -0.34 and 0.34." },
    { valid: design.logoPosition.y >= -0.18 && design.logoPosition.y <= 0.21, path: ["logoPosition", "y"], message: "Bakery-bag front copy y position must be between -0.18 and 0.21." },
  ];
  for (const check of checks) {
    if (!check.valid) context.addIssue({ code: "custom", path: check.path, message: check.message });
  }
});

const stagedPackageDesignSchema = z.object({
  id: z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/),
  design: PackageDesignSchema,
  stagedAt: dateText,
  stagedBy: z.enum(["agent", "founder"]),
  designHash: z.string().min(8).max(128),
});

const packageCommitSchema = z.object({
  id: z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/),
  actor: z.literal("founder"),
  channel: z.literal("workspace_ui"),
  committedAt: dateText,
  sourceRevision: z.number().int().positive(),
  designHash: z.string().min(8).max(128),
  stagedPackageId: z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/),
});

const manufacturerResearchRequestSchema = z.object({
  geographyPreference: z.string().max(100).nullable(),
  resultLimit: z.number().int().min(1).max(3),
  requiredRequirements: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
  preferredRequirements: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
});

const manufacturerResearchSchema = z.object({
  id: z.string().min(1).max(500),
  status: z.enum(["current", "stale"]),
  request: manufacturerResearchRequestSchema,
  planFingerprint: z.string().min(1).max(500),
  candidates: z.array(manufacturerMatchSchema).max(25),
  candidateCount: z.number().int().min(0).max(25),
  ranAt: dateText,
  invalidatedAt: dateText.nullable(),
  broadeningApproval: z.object({
    originalRequest: manufacturerResearchRequestSchema,
    broadenedRequest: manufacturerResearchRequestSchema,
    approvedBy: z.literal("founder"),
    approvedAt: dateText,
    workspaceRevision: z.number().int().positive(),
    mutationId: z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/),
  }).nullable().default(null),
});

const productPlanV3Schema = z.object({
  schemaVersion: z.literal(3),
  originalIdea: nullableText,
  creationRequestHash: z.string().min(8).max(128).nullable().default(null),
  artwork: z.object({
    id: z.string().min(1).max(500),
    fileName: z.string().min(1).max(500),
    contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    byteSize: z.number().int().positive().max(8 * 1024 * 1024),
    createdAt: dateText,
  }).nullable(),
  packageDesign: PackageDesignSchema.nullable(),
  stagedPackageDesign: stagedPackageDesignSchema.nullable().default(null),
  packageCommit: packageCommitSchema.nullable().default(null),
  lastAgentChange: z.object({
    id: z.string().min(1).max(500),
    at: dateText,
    changedKeys: z.array(z.enum(SOURCING_FIELD_KEYS)).max(SOURCING_FIELD_KEYS.length),
    previousFields: z.partialRecord(z.enum(SOURCING_FIELD_KEYS), sourcingFieldSchema),
    packageDesignChanged: z.boolean().optional(),
    previousPackageDesign: PackageDesignSchema.nullable().optional(),
  }).nullable().optional().default(null),
  fields: z.record(z.enum(SOURCING_FIELD_KEYS), sourcingFieldSchema),
  selectedManufacturerSlugs: z.array(z.string().min(1).max(200)).max(3),
  manufacturerResearch: manufacturerResearchSchema.nullable().default(null),
  outreachDrafts: z.array(outreachDraftSchema).max(12),
  inquiries: z.array(inquirySchema).max(50),
});

export const ProductPlanSchema = z.preprocess(migrateProductPlan, productPlanV3Schema);

export type ProductPlan = z.infer<typeof ProductPlanSchema>;

export function productPlanFromWorkspace(workspace: SourcingWorkspace): ProductPlan {
  return ProductPlanSchema.parse({
    schemaVersion: 3,
    originalIdea: workspace.originalIdea,
    creationRequestHash: workspace.creationRequestHash,
    artwork: workspace.artwork,
    packageDesign: workspace.packageDesign,
    stagedPackageDesign: workspace.stagedPackageDesign,
    packageCommit: workspace.packageCommit,
    lastAgentChange: workspace.lastAgentChange,
    fields: workspace.fields,
    selectedManufacturerSlugs: workspace.selectedManufacturerSlugs,
    manufacturerResearch: workspace.manufacturerResearch,
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
  const legacyMatches = Array.isArray(plan.matches) ? plan.matches : [];
  const legacyMatchesUpdatedAt = typeof plan.matchesUpdatedAt === "string" ? plan.matchesUpdatedAt : null;

  return {
    ...plan,
    schemaVersion: 3,
    originalIdea,
    creationRequestHash: plan.creationRequestHash ?? null,
    fields: {
      ...Object.fromEntries(Object.entries(rawFields).map(([key, value]) => [key, migrateField(value, key, plan)])),
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
        confirmation: null,
        validationStatus: "not_required",
        evidence: [],
        sourceSpans: [],
      },
    },
    stagedPackageDesign: plan.stagedPackageDesign ?? null,
    packageCommit: plan.packageCommit ?? null,
    manufacturerResearch: plan.manufacturerResearch ?? (legacyMatchesUpdatedAt ? {
      id: `legacy-research-${legacyMatchesUpdatedAt}`.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 500),
      status: "stale",
      request: { geographyPreference: null, resultLimit: Math.max(1, Math.min(3, legacyMatches.length || 3)), requiredRequirements: [], preferredRequirements: [] },
      planFingerprint: "legacy-unverified",
      candidates: legacyMatches,
      candidateCount: legacyMatches.length,
      ranAt: legacyMatchesUpdatedAt,
      invalidatedAt: legacyMatchesUpdatedAt,
      broadeningApproval: null,
    } : null),
  };
}

function migrateField(value: unknown, key: string, plan: Record<string, unknown>): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const field = value as Record<string, unknown>;
  const confirmed = field.status === "confirmed";
  const updatedAt = typeof field.updatedAt === "string" ? field.updatedAt : new Date(0).toISOString();
  const sourceRevision = typeof plan.revision === "number" ? plan.revision : 0;
  const validationSensitive = ["formula_status", "formulation_assistance", "manufacturing_process", "storage_distribution", "packaging_format", "packaging_size", "certifications", "allergens"].includes(key);
  return {
    ...field,
    confirmation: field.confirmation ?? (confirmed && field.explicitlyStated === true ? {
      id: `legacy-${key}-${updatedAt}`.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 500),
      actor: "founder",
      channel: "legacy_import",
      confirmedAt: updatedAt,
      sourceRevision,
    } : null),
    validationStatus: field.validationStatus ?? (validationSensitive && field.value ? "needs_validation" : "not_required"),
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
