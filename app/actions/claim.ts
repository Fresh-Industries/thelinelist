"use server";

import { getPlantBySlug } from "@/lib/directory";
import { idempotentLeadId, leadFingerprint } from "@/lib/leads/fingerprint";
import { claimInputSchema, zodFieldErrors, type FieldErrors } from "@/lib/leads/schema";
import { createLeadStore } from "@/lib/leads/store";
import { leadSaveFailureMessage } from "@/lib/notify/email";
import {
  botRejected,
  getRequestContext,
  mergeRequestUtm,
  readFormList,
  readFormString,
} from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";

export interface ClaimActionState {
  status: "idle" | "success" | "error" | "duplicate";
  message?: string;
  fieldErrors?: FieldErrors;
}

export async function submitClaim(
  _prev: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const parsed = claimInputSchema.safeParse({
    manufacturerSlug: readFormString(formData, "manufacturerSlug"),
    manufacturerName: readFormString(formData, "manufacturerName"),
    city: readFormString(formData, "city"),
    state: readFormString(formData, "state"),
    contactName: readFormString(formData, "contactName"),
    workEmail: readFormString(formData, "workEmail"),
    phone: readFormString(formData, "phone"),
    role: readFormString(formData, "role"),
    website: readFormString(formData, "website"),
    notListed: readFormString(formData, "notListed"),
    processTags: readFormList(formData, "processTags"),
    productTags: readFormList(formData, "productTags"),
    activityCorrections: readFormString(formData, "activityCorrections"),
    corrections: readFormString(formData, "corrections"),
    featuredInterest: readFormString(formData, "featuredInterest"),
    message: readFormString(formData, "message"),
    street: readFormString(formData, "street"),
    zip: readFormString(formData, "zip"),
    moqCorrection: readFormString(formData, "moqCorrection"),
    certsCorrection: readFormString(formData, "certsCorrection"),
    operationType: readFormString(formData, "operationType"),
    reviewedNote: readFormString(formData, "reviewedNote"),
    sourceAttribution: readFormString(formData, "sourceAttribution"),
    capacityNotes: readFormString(formData, "capacityNotes"),
    equipmentNotes: readFormString(formData, "equipmentNotes"),
    whoBuys: readFormString(formData, "whoBuys"),
    qcSummary: readFormString(formData, "qcSummary"),
    productDev: readFormString(formData, "productDev"),
    storage: readFormString(formData, "storage"),
    distribution: readFormString(formData, "distribution"),
    aboutNotes: readFormString(formData, "aboutNotes"),
    consent: readFormString(formData, "consent"),
    startedAt: readFormString(formData, "startedAt"),
    hp: readFormString(formData, "hp"),
    utm_source: readFormString(formData, "utm_source"),
    utm_medium: readFormString(formData, "utm_medium"),
    utm_campaign: readFormString(formData, "utm_campaign"),
    utm_content: readFormString(formData, "utm_content"),
    utm_term: readFormString(formData, "utm_term"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "We could not send that. Check the highlighted fields, or write hello@thelinelist.com.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const listed = input.notListed !== "yes";
  if (listed) {
    const plant = getPlantBySlug(input.manufacturerSlug);
    if (!plant) {
      return {
        status: "error",
        message: "We could not send that. Try again or write hello@thelinelist.com.",
      };
    }
  }

  const context = await getRequestContext();
  const bot = botRejected({
    honeypot: input.hp ?? "",
    startedAt: input.startedAt,
    userAgent: context.userAgent,
  });
  if (bot === "ignored") {
    return { status: "success", message: "Submitted for review." };
  }
  if (bot) {
    return { status: "error", message: `${bot} Try again or write hello@thelinelist.com.` };
  }

  const limited = await rateLimit({
    key: `claim:${context.ipHash}:${input.workEmail.toLowerCase()}`,
    limit: 3,
    windowSec: 60 * 60,
  });
  if (!limited.ok) {
    return {
      status: "error",
      message: "We could not send that. Try again later, or write hello@thelinelist.com.",
    };
  }

  const fingerprint = leadFingerprint({
    kind: "claim",
    email: input.workEmail,
    slug: input.manufacturerSlug,
  });
  const store = createLeadStore();
  const duplicate = await store.findRecentDuplicate(fingerprint, 1000 * 60 * 60 * 24);
  if (duplicate) {
    return {
      status: "duplicate",
      message:
        "We already have a recent claim from this email for this company. It is in review. We do not auto-approve claims.",
    };
  }

  const { hp: _hp, startedAt: _startedAt, consent: _consent, ...payload } = input;
  void _hp;
  void _startedAt;
  void _consent;

  const createdAt = new Date().toISOString();
  const submissionTypes = [
    input.notListed === "yes" ? "new_facility" : "profile_claim",
    input.activityCorrections || input.corrections || input.moqCorrection || input.certsCorrection ? "profile_correction" : null,
    input.featuredInterest === "yes" ? "featured_listing_interest" : null,
  ].filter((value): value is string => Boolean(value));
  const saved = await store.save({
    id: idempotentLeadId(fingerprint, createdAt),
    kind: "claim",
    manufacturerSlug: input.manufacturerSlug,
    manufacturerName: input.manufacturerName,
    sourceUrl:
      listed && input.manufacturerSlug !== "not-listed"
        ? absoluteUrl(`/manufacturers/${input.manufacturerSlug}`)
        : absoluteUrl("/claim-submit"),
    createdAt,
    utm: mergeRequestUtm(formData, context.utmCookie),
    payload: {
      ...payload,
      _lead: {
        submissionTypes,
        contact: { name: input.contactName, email: input.workEmail, phone: input.phone || null, role: input.role },
        consent: { granted: true, recordedAt: createdAt },
        status: "received",
        notification: { state: "pending", updatedAt: createdAt },
      },
    },
    fingerprint,
  });

  if (!saved.ok) {
    console.error("[lead-store] save failed", {
      kind: "claim",
      manufacturerSlug: input.manufacturerSlug,
      adapter: saved.adapter,
      error: saved.error ?? "Unknown lead storage error.",
    });
    return {
      status: "error",
      message: leadSaveFailureMessage(saved.error),
    };
  }

  return {
    status: "success",
    message:
      "Submitted for review. We will not auto-approve a claim. We still verify facts against the plant's public site. Blank fields stay unpublished.",
  };
}
