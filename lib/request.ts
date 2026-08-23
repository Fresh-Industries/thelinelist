import { cookies, headers } from "next/headers";
import { sha256 } from "@/lib/hash";
import { mergeUtm, parseUtmCookie, utmFromForm, UTM_COOKIE, type UtmParams } from "@/lib/utm";

export async function getRequestContext(): Promise<{
  ipHash: string;
  userAgent: string;
  utmCookie: UtmParams;
}> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  const userAgent = headerList.get("user-agent") ?? "";
  const cookieStore = await cookies();
  return {
    ipHash: sha256(ip).slice(0, 24),
    userAgent,
    utmCookie: parseUtmCookie(cookieStore.get(UTM_COOKIE)?.value),
  };
}

export function mergeRequestUtm(formData: FormData, cookieUtm: UtmParams): UtmParams {
  return mergeUtm(utmFromForm(formData), cookieUtm);
}

export function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readFormList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function botRejected(options: {
  honeypot: string;
  startedAt: string;
  userAgent: string;
  minMs?: number;
}): string | null {
  if (options.honeypot.trim()) {
    return "ignored";
  }
  if (!options.userAgent.trim()) {
    return "We could not send that.";
  }
  const started = Number(options.startedAt);
  const minMs = options.minMs ?? 2000;
  if (options.startedAt.trim() && Number.isFinite(started) && Date.now() - started < minMs) {
    return "We could not send that.";
  }
  return null;
}

export function absoluteSourceUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.thelinelist.com";
  return `${base.replace(/\/$/, "")}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
