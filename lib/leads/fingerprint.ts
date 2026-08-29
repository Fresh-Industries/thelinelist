import { sha256 } from "@/lib/hash";
import type { LeadKind } from "./types";

export function leadFingerprint(options: {
  kind: LeadKind;
  email: string;
  slug: string;
}): string {
  return sha256(`${options.kind}:${options.email.trim().toLowerCase()}:${options.slug}`);
}

export function newLeadId(): string {
  return crypto.randomUUID();
}

export function idempotentLeadId(fingerprint: string, createdAt: string): string {
  const day = createdAt.slice(0, 10);
  return `lead_${sha256(`${fingerprint}:${day}`).slice(0, 40)}`;
}
