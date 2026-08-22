import { getNewsletterProvider } from "./config";

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

  switch (provider) {
    case "beehiiv":
      return subscribeBeehiiv(email);
    case "kit":
      return subscribeKit(email);
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
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
