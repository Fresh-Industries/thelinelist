export type NewsletterProvider = "beehiiv" | "kit";

export interface NewsletterConfig {
  provider: NewsletterProvider;
}

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getNewsletterProvider(): NewsletterProvider | null {
  const explicit = read("NEWSLETTER_PROVIDER").toLowerCase();
  switch (explicit) {
    case "beehiiv":
      return beehiivReady() ? "beehiiv" : null;
    case "kit":
    case "convertkit":
      return kitReady() ? "kit" : null;
    case "":
      if (beehiivReady()) return "beehiiv";
      if (kitReady()) return "kit";
      return null;
    default:
      return null;
  }
}

export function isNewsletterEnabled(): boolean {
  return getNewsletterProvider() !== null;
}

export function beehiivReady(): boolean {
  return Boolean(read("BEEHIIV_API_KEY") && read("BEEHIIV_PUBLICATION_ID"));
}

export function kitReady(): boolean {
  return Boolean((read("KIT_API_KEY") || read("CONVERTKIT_API_SECRET")) && read("KIT_FORM_ID"));
}

export function getNewsletterConfig(): NewsletterConfig | null {
  const provider = getNewsletterProvider();
  return provider ? { provider } : null;
}
