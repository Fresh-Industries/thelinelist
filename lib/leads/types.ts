import type { UtmParams } from "@/lib/utm";

export type LeadKind = "intro" | "claim";

export interface LeadRecord {
  id: string;
  kind: LeadKind;
  manufacturerSlug: string;
  manufacturerName: string;
  sourceUrl: string;
  createdAt: string;
  utm: UtmParams;
  payload: Record<string, unknown>;
  fingerprint: string;
}

export interface StoreResult {
  ok: boolean;
  adapter: "postgres" | "unconfigured";
  id: string;
  duplicate?: boolean;
  notificationState?: "pending" | "sent" | "failed";
  notificationProvider?: "resend" | "postmark" | "none";
  error?: string;
}

export interface LeadStore {
  save(record: LeadRecord): Promise<StoreResult>;
  findRecentDuplicate(fingerprint: string, withinMs: number): Promise<LeadRecord | null>;
}
