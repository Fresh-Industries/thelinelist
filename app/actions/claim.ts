"use server";

import { getPlantBySlug } from "@/lib/directory";
import { leadFingerprint, newLeadId } from "@/lib/leads/fingerprint";
import { claimInputSchema, zodFieldErrors, type FieldErrors } from "@/lib/leads/schema";
import { createLeadStore } from "@/lib/leads/store";
import {
  botRejected,
  getRequestContext,
  mergeRequestUtm,
  readFormList,
  readFormString,
} from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export interface ClaimActionState {
  status: "idle" | "success" | "error" | "duplicate";
  message?: string;
  fieldErrors?: FieldErrors;
}

export const idleClaimState: ClaimActionState = { status: "idle" };

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

  const { hp: _hp, startedAt: _startedAt, ...payload } = input;
  void _hp;
  void _startedAt;

  const saved = await store.save({
    id: newLeadId(),
    kind: "claim",
    manufacturerSlug: input.manufacturerSlug,
    manufacturerName: input.manufacturerName,
    sourceUrl:
      listed && input.manufacturerSlug !== "not-listed"
        ? `https://the-line-list.vercel.app/copackers/${input.manufacturerSlug}`
        : "https://the-line-list.vercel.app/about#claim",
    createdAt: new Date().toISOString(),
    utm: mergeRequestUtm(formData, context.utmCookie),
    payload,
    fingerprint,
  });

  if (!saved.ok) {
    return {
      status: "error",
      message: "We could not send that. Try again or write hello@thelinelist.com.",
    };
  }

  return {
    status: "success",
    message:
      "Submitted for review. We will not auto-approve a claim. We still verify facts against the plant's public site. Blank fields stay unpublished.",
  };
}
