import { getNewsletterProvider } from "./config";
import { getOwnerNotifyAddress, sendEmail } from "@/lib/notify/email";
import { SITE_NAME } from "@/lib/site";

export interface NewsletterSubscribeResult {
  ok: boolean;
  provider: "beehiiv" | "kit" | "none";
  error?: string;
}

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export async function subscribeNewsletter(email: string): Promise<NewsletterSubscribeResult> {
  const provider = getNewsletterProvider();
  if (!provider) {
    return { ok: false, provider: "none", error: "Newsletter is not configured." };
  }

  let subscribed: NewsletterSubscribeResult;
  switch (provider) {
    case "beehiiv":
      subscribed = await subscribeBeehiiv(email);
      break;
    case "kit":
      subscribed = await subscribeKit(email);
      break;
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }

  if (!subscribed.ok) return subscribed;

  const notified = await sendEmail({
    to: getOwnerNotifyAddress(),
    subject: `${SITE_NAME}: New newsletter subscriber`,
    replyTo: email,
    text: [
      "A new reader subscribed to The Line List newsletter.",
      "",
      `Email: ${email}`,
      `Newsletter provider: ${subscribed.provider}`,
      `Submitted: ${new Date().toISOString()}`,
    ].join("\n"),
    tags: { kind: "newsletter" },
  });

  if (!notified.ok) {
    console.error("[newsletter-notify] owner notification failed", {
      provider: notified.provider,
      error: notified.error ?? "Unknown email error.",
    });
  }

  return subscribed;
}

async function subscribeBeehiiv(email: string): Promise<NewsletterSubscribeResult> {
  const publicationId = read("BEEHIIV_PUBLICATION_ID");
  const response = await fetch(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${read("BEEHIIV_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: "thelinelist",
      }),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      provider: "beehiiv",
      error: `Beehiiv HTTP ${response.status}`,
    };
  }
  return { ok: true, provider: "beehiiv" };
}

async function subscribeKit(email: string): Promise<NewsletterSubscribeResult> {
  const formId = read("KIT_FORM_ID");
  const apiSecret = read("KIT_API_KEY") || read("CONVERTKIT_API_SECRET");
  const response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_secret: apiSecret,
      email,
    }),
  });

  if (!response.ok) {
    return { ok: false, provider: "kit", error: `Kit HTTP ${response.status}` };
  }
  return { ok: true, provider: "kit" };
}
