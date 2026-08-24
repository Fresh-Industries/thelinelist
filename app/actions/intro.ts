"use server";

import { getPlantBySlug } from "@/lib/directory";
import { leadFingerprint, newLeadId } from "@/lib/leads/fingerprint";
import { introInputSchema, zodFieldErrors, type FieldErrors } from "@/lib/leads/schema";
import { createLeadStore } from "@/lib/leads/store";
import { leadSaveFailureMessage } from "@/lib/notify/email";
import {
  absoluteSourceUrl,
  botRejected,
  getRequestContext,
  mergeRequestUtm,
  readFormString,
} from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export interface IntroActionState {
  status: "idle" | "success" | "error" | "duplicate";
  message?: string;
  fieldErrors?: FieldErrors;
}

export async function submitIntro(
  _prev: IntroActionState,
  formData: FormData,
): Promise<IntroActionState> {
  const parsed = introInputSchema.safeParse({
    name: readFormString(formData, "name"),
    email: readFormString(formData, "email"),
    phone: readFormString(formData, "phone"),
    company: readFormString(formData, "company"),
    product: readFormString(formData, "product"),
    category: readFormString(formData, "category"),
    process: readFormString(formData, "process"),
    processNeeds: readFormString(formData, "processNeeds"),
    packagingFormat: readFormString(formData, "packagingFormat"),
    packSize: readFormString(formData, "packSize"),
    qty: readFormString(formData, "qty"),
    moqReady: readFormString(formData, "moqReady"),
    launchDate: readFormString(formData, "launchDate"),
    location: readFormString(formData, "location"),
    webSocial: readFormString(formData, "webSocial"),
    stage: readFormString(formData, "stage"),
    details: readFormString(formData, "details"),
    certsNeeded: readFormString(formData, "certsNeeded"),
    certsRequired: readFormString(formData, "certsRequired"),
    formulaStatus: readFormString(formData, "formulaStatus"),
    specsReady: readFormString(formData, "specsReady"),
    allergens: readFormString(formData, "allergens"),
    acidifiedStatus: readFormString(formData, "acidifiedStatus"),
    budgetReadiness: readFormString(formData, "budgetReadiness"),
    whoSupplies: readFormString(formData, "whoSupplies"),
    scaleUpGoals: readFormString(formData, "scaleUpGoals"),
    storagePlan: readFormString(formData, "storagePlan"),
    nda: readFormString(formData, "nda"),
    manufacturerSlug: readFormString(formData, "manufacturerSlug"),
    manufacturerName: readFormString(formData, "manufacturerName"),
    sourceUrl: readFormString(formData, "sourceUrl"),
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
  const plant = getPlantBySlug(input.manufacturerSlug);
  if (!plant || plant.name !== input.manufacturerName) {
    return {
      status: "error",
      message: "We could not send that. Try again or write hello@thelinelist.com.",
    };
  }

  const context = await getRequestContext();
  const bot = botRejected({
    honeypot: input.hp ?? "",
    startedAt: input.startedAt,
    userAgent: context.userAgent,
  });
  if (bot === "ignored") {
    return { status: "success", message: "We got it." };
  }
  if (bot) {
    return { status: "error", message: `${bot} Try again or write hello@thelinelist.com.` };
  }

  const limited = await rateLimit({
    key: `intro:${context.ipHash}:${input.email.toLowerCase()}`,
    limit: 5,
    windowSec: 60 * 60,
  });
  if (!limited.ok) {
    return {
      status: "error",
      message: "We could not send that. Try again later, or write hello@thelinelist.com.",
    };
  }

  const fingerprint = leadFingerprint({
    kind: "intro",
    email: input.email,
    slug: plant.slug,
  });
  const store = createLeadStore();
  const duplicate = await store.findRecentDuplicate(fingerprint, 1000 * 60 * 60 * 24);
  if (duplicate) {
    return {
      status: "duplicate",
      message: "We already have a recent request from this email for this manufacturer. We will follow up by email.",
    };
  }

  const { hp: _hp, startedAt: _startedAt, ...payload } = input;
  void _hp;
  void _startedAt;

  const saved = await store.save({
    id: newLeadId(),
    kind: "intro",
    manufacturerSlug: plant.slug,
    manufacturerName: plant.name,
    sourceUrl: absoluteSourceUrl(input.sourceUrl),
    createdAt: new Date().toISOString(),
    utm: mergeRequestUtm(formData, context.utmCookie),
    payload,
    fingerprint,
  });

  if (!saved.ok) {
    console.error("[lead-store] save failed", {
      kind: "intro",
      manufacturerSlug: plant.slug,
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
    message: "We have your request. We will follow up by email about next steps.",
  };
}
