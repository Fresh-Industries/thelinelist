import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

export type EmailProvider = "resend" | "postmark";

export interface EmailMessage {
  to: string | string[];
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
  return read("NOTIFY_FROM_EMAIL") || `${SITE_NAME} <${SITE_EMAIL}>`;
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
      from: getNotifyFromAddress(),
      to: Array.isArray(message.to) ? message.to : [message.to],
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
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": read("POSTMARK_SERVER_TOKEN"),
    },
    body: JSON.stringify({
      From: getNotifyFromAddress(),
      To: to,
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
