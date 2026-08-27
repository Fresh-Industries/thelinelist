import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const DEFAULT_NOTIFY_FROM_ADDRESS = `${SITE_NAME} <${SITE_EMAIL}>`;
const DEFAULT_RESEND_FROM_ADDRESS = `${SITE_NAME} <notifications@mail.thelinelist.com>`;

export type EmailProvider = "resend" | "postmark";

export interface EmailMessage {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface NotifyResult {
  ok: boolean;
  provider: EmailProvider | "none";
  error?: string;
}

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getNotifyFromAddress(): string {
  const configured = read("NOTIFY_FROM_EMAIL");
  if (configured) return configured;

  const provider = getEmailProvider();
  return provider === "resend" ? DEFAULT_RESEND_FROM_ADDRESS : DEFAULT_NOTIFY_FROM_ADDRESS;
}

export function getOwnerNotifyAddress(): string {
  return read("NOTIFY_TO_EMAIL") || SITE_EMAIL;
}

export function getEmailProvider(): EmailProvider | null {
  const explicit = read("EMAIL_PROVIDER").toLowerCase();
  switch (explicit) {
    case "resend":
      return read("RESEND_API_KEY") ? "resend" : null;
    case "postmark":
      return read("POSTMARK_SERVER_TOKEN") ? "postmark" : null;
    case "":
      if (read("RESEND_API_KEY")) return "resend";
      if (read("POSTMARK_SERVER_TOKEN")) return "postmark";
      return null;
    default:
      return null;
  }
}

export function isNotifyConfigured(): boolean {
  return getEmailProvider() !== null;
}

export function leadSaveFailureMessage(error?: string): string {
  if (error?.includes("No email provider configured")) {
    return "Email notifications are not configured on this deployment. Please write hello@thelinelist.com and mention LL-EMAIL-01.";
  }
  if (error?.includes("notification failed")) {
    return "Your answers could not be delivered by our email service. Try again, or write hello@thelinelist.com and mention LL-EMAIL-02.";
  }
  if (error?.includes("not configured")) {
    return "Email notifications are not configured on this deployment. Please write hello@thelinelist.com and mention LL-EMAIL-01.";
  }
  return "We could not save your request. Try again, or write hello@thelinelist.com and mention LL-STORE-01.";
}

export async function sendEmail(message: EmailMessage): Promise<NotifyResult> {
  const provider = getEmailProvider();
  if (!provider) {
    return { ok: false, provider: "none", error: "No email provider configured." };
  }

  try {
    switch (provider) {
      case "resend":
        return await sendWithResend(message);
      case "postmark":
        return await sendWithPostmark(message);
      default: {
        const _exhaustive: never = provider;
        return _exhaustive;
      }
    }
  } catch (error) {
    return {
      ok: false,
      provider,
      error: error instanceof Error ? error.message.slice(0, 400) : "Email request failed.",
    };
  }
}

async function sendWithResend(message: EmailMessage): Promise<NotifyResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${read("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "User-Agent": "TheLineList/1.0",
    },
    body: JSON.stringify({
      from: message.from || getNotifyFromAddress(),
      to: Array.isArray(message.to) ? message.to : [message.to],
      cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
      subject: message.subject,
      text: message.text,
      html: message.html ?? undefined,
      reply_to: message.replyTo,
      tags: message.tags
        ? Object.entries(message.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    }),
  });

  if (!response.ok) {
    const detail = await safeText(response);
    return { ok: false, provider: "resend", error: detail || `Resend HTTP ${response.status}` };
  }
  return { ok: true, provider: "resend" };
}

async function sendWithPostmark(message: EmailMessage): Promise<NotifyResult> {
  const to = Array.isArray(message.to) ? message.to.join(",") : message.to;
  const cc = message.cc ? (Array.isArray(message.cc) ? message.cc.join(",") : message.cc) : undefined;
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": read("POSTMARK_SERVER_TOKEN"),
    },
    body: JSON.stringify({
      From: message.from || getNotifyFromAddress(),
      To: to,
      Cc: cc,
      Subject: message.subject,
      TextBody: message.text,
      HtmlBody: message.html,
      ReplyTo: message.replyTo,
      MessageStream: read("POSTMARK_MESSAGE_STREAM") || "outbound",
    }),
  });

  if (!response.ok) {
    const detail = await safeText(response);
    return { ok: false, provider: "postmark", error: detail || `Postmark HTTP ${response.status}` };
  }
  return { ok: true, provider: "postmark" };
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 400);
  } catch {
    return "";
  }
}
