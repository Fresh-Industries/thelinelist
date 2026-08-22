"use server";

import { newsletterInputSchema, zodFieldErrors, type FieldErrors } from "@/lib/leads/schema";
import { isNewsletterEnabled } from "@/lib/newsletter/config";
import { subscribeNewsletter } from "@/lib/newsletter/subscribe";
import { botRejected, getRequestContext, readFormString } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export interface NewsletterActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
}

export const idleNewsletterState: NewsletterActionState = { status: "idle" };

export async function submitNewsletter(
  _prev: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  if (!isNewsletterEnabled()) {
    return { status: "error", message: "We could not send that." };
  }

  const parsed = newsletterInputSchema.safeParse({
    email: readFormString(formData, "email"),
    startedAt: readFormString(formData, "startedAt"),
    hp: readFormString(formData, "hp"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "We could not send that. Check the email, or write hello@thelinelist.com.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const context = await getRequestContext();
  const bot = botRejected({
    honeypot: parsed.data.hp ?? "",
    startedAt: parsed.data.startedAt,
    userAgent: context.userAgent,
  });
  if (bot === "ignored") {
    return { status: "success", message: "You are on the list." };
  }
  if (bot) {
    return { status: "error", message: `${bot} Try again or write hello@thelinelist.com.` };
  }

  const limited = await rateLimit({
    key: `newsletter:${context.ipHash}:${parsed.data.email.toLowerCase()}`,
    limit: 8,
    windowSec: 60 * 60,
  });
  if (!limited.ok) {
    return {
      status: "error",
      message: "We could not send that. Try again later, or write hello@thelinelist.com.",
    };
  }

  const result = await subscribeNewsletter(parsed.data.email);
  if (!result.ok) {
    return {
      status: "error",
      message: "We could not send that. Try again or write hello@thelinelist.com.",
    };
  }

  return { status: "success", message: "You are on the Tuesday list." };
}
