import { randomBytes, randomUUID } from "node:crypto";
import { getPlantBySlug } from "@/lib/directory";
import { SITE_URL } from "@/lib/site";
import { FIELD_DEFINITION_BY_KEY, NEVER_SHARE_FIELD_KEYS, SOURCING_FIELD_DEFINITIONS } from "./fields";
import type { ManufacturerMatch, OutreachDraft, SourcingFieldKey, SourcingWorkspace } from "./types";

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getDemoRecipient(): string | null {
  return read("SOURCING_DEMO_RECIPIENT") || null;
}

export function isSourcingDemoDeliveryConfigured(): boolean {
  return Boolean(getDemoRecipient());
}

export function packetUrl(token: string): string {
  const base = (read("NEXT_PUBLIC_SITE_URL") || SITE_URL).replace(/\/$/, "");
  return `${base}/packet/${token}`;
}

function confirmedShareableKeys(workspace: SourcingWorkspace): SourcingFieldKey[] {
  return SOURCING_FIELD_DEFINITIONS.flatMap(({ key }) => {
    const field = workspace.fields[key];
    return field.status === "confirmed" && field.value && field.shareWithManufacturer && !NEVER_SHARE_FIELD_KEYS.has(key) ? [key] : [];
  });
}

function warningsFor(workspace: SourcingWorkspace, match: ManufacturerMatch | undefined): string[] {
  const warnings: string[] = [];
  if (workspace.fields.production_volume.status !== "confirmed") warnings.push("Initial production volume is still missing.");
  if (workspace.fields.contact_email.status !== "confirmed") warnings.push("Add a confirmed contact email before sending.");
  if (workspace.fields.formula_status.status !== "confirmed") warnings.push("Formula status is not confirmed.");
  const proposedCount = Object.values(workspace.fields).filter((field) => field.status === "proposed").length;
  if (proposedCount) warnings.push(`${proposedCount} agent proposal${proposedCount === 1 ? " is" : "s are"} excluded until the founder confirms them.`);
  if (match?.possibleConflicts.length) warnings.push("Review the possible fit conflicts before approving outreach.");
  return warnings;
}

function questionsFor(workspace: SourcingWorkspace, match: ManufacturerMatch | undefined): string[] {
  const questions = match?.evidence
    .filter((evidence) => evidence.status === "not_publicly_listed")
    .slice(0, 4)
    .map((evidence) => questionForUnknown(workspace, evidence.requirementKey)) ?? [];
  if (workspace.fields.production_volume.status !== "confirmed") questions.push("What first-run volume and current minimum would you recommend for this product?");
  if (workspace.fields.formula_status.status !== "confirmed") questions.push("What formula-readiness stage do you require before a first technical review?");
  return [...new Set(questions)].slice(0, 6);
}

function questionForUnknown(workspace: SourcingWorkspace, key: SourcingFieldKey): string {
  const value = workspace.fields[key].value;
  switch (key) {
    case "formulation_assistance": return "Can your team provide formulation or product-development help for this project?";
    case "packaging_format": return `Can the current line run the requested ${value?.toLowerCase() || "package format"}?`;
    case "packaging_size": return `Can the current line run the requested ${value || "package size"}?`;
    case "carbonation": return "Can the relevant line produce carbonated beverages?";
    case "certifications": return `Which current facility and line certifications cover the requested ${value || "requirements"}?`;
    case "production_volume": return `Would ${value || "the proposed first run"} meet the current minimum for this line?`;
    default: return `Can you confirm the current ${FIELD_DEFINITION_BY_KEY[key].label.toLowerCase()} for this product and line?`;
  }
}

function formatSharedDetails(workspace: SourcingWorkspace, keys: SourcingFieldKey[]): string {
  return keys.map((key) => `- ${FIELD_DEFINITION_BY_KEY[key].label}: ${workspace.fields[key].value}`).join("\n");
}

function createBody(
  workspace: SourcingWorkspace,
  manufacturerName: string,
  match: ManufacturerMatch | undefined,
  keys: SourcingFieldKey[],
  questions: string[],
  token: string,
  founderInstructions?: string,
): string {
  const name = workspace.fields.founder_name.value;
  const company = workspace.fields.company_name.value;
  const greeting = `Hello ${manufacturerName} team,`;
  const introduction = name
    ? `My name is ${name}${company ? `, and I’m working on ${company}` : ""}.`
    : company ? `I’m working on ${company}.` : "I’m preparing a new food or beverage product.";
  const fit = match?.supportedMatches.length
    ? `The Line List’s reviewed public information suggests a possible fit. ${match.supportedMatches.slice(0, 2).join(" ")}`
    : "I would like to learn whether this project may fit your current capabilities.";
  const instructions = founderInstructions ? `Additional context: ${founderInstructions}` : null;
  return ([
    greeting,
    "",
    introduction,
    fit,
    instructions,
    "",
    "Project details:",
    formatSharedDetails(workspace, keys) || "- A detailed brief is still being prepared.",
    "",
    "Questions:",
    ...questions.map((question) => `- ${question}`),
    "",
    `Product brief: ${packetUrl(token)}`,
    "",
    "Thank you for considering the project.",
  ] as Array<string | null>).filter((line): line is string => line !== null).join("\n");
}

export function prepareOutreachDrafts(
  workspace: SourcingWorkspace,
  input: { selectedManufacturerIds: string[]; founderInstructions?: string; proposedSharedFields?: SourcingFieldKey[] },
): OutreachDraft[] {
  const now = new Date();
  const timestamp = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const baseIncluded = confirmedShareableKeys(workspace);
  const requested = new Set(input.proposedSharedFields ?? baseIncluded);
  const included = baseIncluded.filter((key) => requested.has(key));
  const excluded = SOURCING_FIELD_DEFINITIONS.map(({ key }) => key).filter((key) => !included.includes(key));
  const fieldValues = Object.fromEntries(included.flatMap((key) => {
    const value = workspace.fields[key].value;
    return value ? [[key, value]] : [];
  })) as Partial<Record<SourcingFieldKey, string>>;

  return input.selectedManufacturerIds.flatMap((slug) => {
    const plant = getPlantBySlug(slug);
    if (!plant || plant.introductionsPaused) return [];
    const match = workspace.matches.find((candidate) => candidate.manufacturerSlug === slug);
    const token = randomBytes(24).toString("base64url");
    const questions = questionsFor(workspace, match);
    const product = workspace.fields.product_type.value || "product inquiry";
    const draft: OutreachDraft = {
      id: randomUUID(),
      manufacturerSlug: plant.slug,
      manufacturerName: plant.name,
      subject: `${product} manufacturing inquiry`,
      body: createBody(workspace, plant.name, match, included, questions, token, input.founderInstructions),
      questions,
      includedFieldKeys: included,
      excludedFieldKeys: excluded,
      warnings: warningsFor(workspace, match),
      packet: {
        token,
        manufacturerSlug: plant.slug,
        manufacturerName: plant.name,
        includedFieldKeys: included,
        fieldValues,
        questions,
        createdAt: timestamp,
        expiresAt,
        revokedAt: null,
      },
      availableDeliveryMethod: isSourcingDemoDeliveryConfigured() ? "safe_demo_email" : "not_configured",
      demoRecipient: getDemoRecipient(),
      version: 1,
      approvedVersion: null,
      approvedAt: null,
      sentAt: null,
      deliveryStatus: "draft",
      deliveryError: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return [draft];
  });
}

export function editAndApproveDraft(
  draft: OutreachDraft,
  workspace: SourcingWorkspace,
  input: { subject: string; body: string; includedFieldKeys: SourcingFieldKey[] },
): OutreachDraft {
  if (draft.sentAt) throw new Error("A sent draft cannot be changed.");
  const includedFieldKeys = [...new Set(input.includedFieldKeys)].filter((key) => !NEVER_SHARE_FIELD_KEYS.has(key));
  const version = draft.version + 1;
  const timestamp = new Date().toISOString();
  const fieldValues = Object.fromEntries(includedFieldKeys.flatMap((key) => {
    const field = workspace.fields[key];
    return field.status === "confirmed" && field.value ? [[key, field.value]] : [];
  })) as Partial<Record<SourcingFieldKey, string>>;
  const approvedKeys = includedFieldKeys.filter((key) => fieldValues[key]);
  return {
    ...draft,
    subject: input.subject,
    body: input.body,
    includedFieldKeys: approvedKeys,
    excludedFieldKeys: SOURCING_FIELD_DEFINITIONS.map(({ key }) => key).filter((key) => !approvedKeys.includes(key)),
    packet: { ...draft.packet, includedFieldKeys: approvedKeys, fieldValues },
    version,
    approvedVersion: version,
    approvedAt: timestamp,
    deliveryStatus: "approved",
    deliveryError: null,
    updatedAt: timestamp,
  };
}
