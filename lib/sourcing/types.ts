export const SOURCING_FIELD_KEYS = [
  "product_type",
  "product_description",
  "formula_status",
  "formulation_assistance",
  "carbonation",
  "manufacturing_process",
  "packaging_format",
  "packaging_size",
  "production_volume",
  "budget",
  "certifications",
  "preferred_geography",
  "target_launch_date",
  "ingredient_sourcing",
  "packaging_sourcing",
  "storage_distribution",
  "confirmed_decisions",
  "proposed_assumptions",
  "missing_information",
  "internal_notes",
  "manufacturer_information",
  "founder_name",
  "company_name",
  "company_introduction",
  "contact_email",
  "contact_phone",
] as const;

export type SourcingFieldKey = (typeof SOURCING_FIELD_KEYS)[number];
export type SourcingFieldStatus = "confirmed" | "proposed" | "unknown" | "needs_decision" | "rejected";
export type WorkspaceActor = "founder" | "agent" | "system";

export interface SourcingField {
  key: SourcingFieldKey;
  value: string | null;
  status: SourcingFieldStatus;
  reason: string | null;
  source: string | null;
  explicitlyStated: boolean;
  shareWithManufacturer: boolean;
  updatedAt: string;
  updatedBy: WorkspaceActor;
}

export type EvidenceStatus = "verified" | "publicly_listed" | "unknown" | "not_publicly_listed" | "conflicting";

export interface MatchEvidence {
  requirementKey: SourcingFieldKey;
  requirementLabel: string;
  claim: string;
  status: EvidenceStatus;
  sourceType: "company_published" | "directory_reported" | "mixed_public_sources";
  sourceUrl: string | null;
  sourceLabel: string | null;
  lastReviewed: string;
  confidence: number | null;
  notes: string | null;
}

export interface ManufacturerMatch {
  manufacturerSlug: string;
  manufacturerName: string;
  location: string;
  fitExplanation: string;
  supportedMatches: string[];
  possibleConflicts: string[];
  unknowns: string[];
  evidence: MatchEvidence[];
  requirementsUsed: SourcingFieldKey[];
  introductionAvailable: boolean;
  deliveryMethod: "line_list_introduction" | "external_contact_only" | "paused";
  lastReviewed: string;
}

export interface SourcingPacket {
  token: string;
  manufacturerSlug: string;
  manufacturerName: string;
  includedFieldKeys: SourcingFieldKey[];
  fieldValues: Partial<Record<SourcingFieldKey, string>>;
  questions: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface OutreachDraft {
  id: string;
  manufacturerSlug: string;
  manufacturerName: string;
  subject: string;
  body: string;
  questions: string[];
  includedFieldKeys: SourcingFieldKey[];
  excludedFieldKeys: SourcingFieldKey[];
  warnings: string[];
  packet: SourcingPacket;
  availableDeliveryMethod: "safe_demo_email" | "not_configured";
  demoRecipient: string | null;
  version: number;
  approvedVersion: number | null;
  approvedAt: string | null;
  sentAt: string | null;
  deliveryStatus: "draft" | "approved" | "sent" | "failed";
  deliveryError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturerInquiry {
  draftId: string;
  manufacturerSlug: string;
  manufacturerName: string;
  status: "contacted";
  contactedAt: string;
  deliveryMethod: "safe_demo_email";
}

export interface WorkspaceActivity {
  id: string;
  kind: "created" | "agent_proposed" | "founder_updated" | "matched" | "drafted" | "approved" | "sent" | "send_failed";
  message: string;
  at: string;
}

export interface SourcingWorkspace {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  fields: Record<SourcingFieldKey, SourcingField>;
  selectedManufacturerSlugs: string[];
  matches: ManufacturerMatch[];
  matchesUpdatedAt: string | null;
  outreachDrafts: OutreachDraft[];
  inquiries: ManufacturerInquiry[];
  activity: WorkspaceActivity[];
}

export interface AgentFieldUpdate {
  key: SourcingFieldKey;
  value: string | null;
  reason?: string;
  source?: string;
  explicitlyStated: boolean;
  suggestedSharing?: boolean;
}
