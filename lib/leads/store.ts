import {
  getOwnerNotifyAddress,
  isNotifyConfigured,
  sendEmail,
  type NotifyResult,
} from "@/lib/notify/email";
import { SITE_NAME } from "@/lib/site";
import type { LeadRecord, LeadStore, StoreResult } from "./types";
import type { Prisma } from "@/generated/prisma/client";
import { databaseConfigured, prisma } from "@/lib/db/prisma";

const memoryRecords = new Map<string, LeadRecord[]>();

export function getLeadStoreAdapterName(): "postgres" | "email-archive" | "memory" {
  if (databaseConfigured()) return "postgres";
  if (isNotifyConfigured()) return "email-archive";
  return "memory";
}

export function createLeadStore(): LeadStore {
  return {
    async save(record) {
      if (databaseConfigured()) {
        const stored = await saveToPostgres(record);
        if (stored.ok) {
          const notified = await notifyOwner(record, "postgres");
          if (!notified.ok) {
            return {
              ...stored,
              ok: false,
              error: notifyError(notified),
            };
          }
          return stored;
        }
      }

      if (isNotifyConfigured()) {
        return saveToEmailArchive(record);
      }

      const memory = saveToMemory(record);
      return {
        ...memory,
        ok: false,
        error: "Owner email notifications are not configured.",
      };
    },
    async findRecentDuplicate(fingerprint, withinMs) {
      const local = findMemoryDuplicate(fingerprint, withinMs);
      if (local) return local;
      if (databaseConfigured()) {
        return findPostgresDuplicate(fingerprint, withinMs);
      }
      return null;
    },
  };
}

async function saveToPostgres(record: LeadRecord): Promise<StoreResult> {
  try {
    await prisma.leadSubmission.create({ data: {
      id: record.id,
      kind: record.kind,
      manufacturerSlug: record.manufacturerSlug,
      manufacturerName: record.manufacturerName,
      sourceUrl: record.sourceUrl,
      utm: record.utm as unknown as Prisma.InputJsonValue,
      payload: record.payload as Prisma.InputJsonValue,
      fingerprint: record.fingerprint,
      createdAt: new Date(record.createdAt),
    } });
  } catch (error) {
    return {
      ok: false,
      adapter: "postgres",
      id: record.id,
      error: error instanceof Error ? error.message : "PostgreSQL write failed",
    };
  }
  remember(record);
  return { ok: true, adapter: "postgres", id: record.id };
}

async function findPostgresDuplicate(
  fingerprint: string,
  withinMs: number,
): Promise<LeadRecord | null> {
  const row = await prisma.leadSubmission.findFirst({
    where: { fingerprint, createdAt: { gte: new Date(Date.now() - withinMs) } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind as LeadRecord["kind"],
    manufacturerSlug: row.manufacturerSlug,
    manufacturerName: row.manufacturerName,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt.toISOString(),
    utm: row.utm as unknown as LeadRecord["utm"],
    payload: row.payload as LeadRecord["payload"],
    fingerprint: row.fingerprint,
  };
}

async function saveToEmailArchive(record: LeadRecord): Promise<StoreResult> {
  const notified = await notifyOwner(record, "email-archive");
  if (!notified.ok) {
    return {
      ok: false,
      adapter: "email-archive",
      id: record.id,
      error: notifyError(notified),
    };
  }
  remember(record);
  return { ok: true, adapter: "email-archive", id: record.id };
}

function saveToMemory(record: LeadRecord): StoreResult {
  remember(record);
  return { ok: true, adapter: "memory", id: record.id };
}

function remember(record: LeadRecord): void {
  const list = memoryRecords.get(record.fingerprint) ?? [];
  list.push(record);
  memoryRecords.set(record.fingerprint, list);
}

function findMemoryDuplicate(fingerprint: string, withinMs: number): LeadRecord | null {
  const now = Date.now();
  const list = memoryRecords.get(fingerprint) ?? [];
  return (
    list.find((record) => now - Date.parse(record.createdAt) <= withinMs) ?? null
  );
}

async function notifyOwner(record: LeadRecord, via: string): Promise<NotifyResult> {
  const kindLabel = record.kind === "intro" ? "Contact-help request" : "Profile claim";
  const replyTo = [record.payload.email, record.payload.workEmail].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return sendEmail({
    to: getOwnerNotifyAddress(),
    subject: `${SITE_NAME}: ${kindLabel} for ${record.manufacturerName}`,
    replyTo,
    text: formatLeadText(record, via),
    tags: { kind: record.kind, slug: record.manufacturerSlug },
  });
}

function notifyError(result: NotifyResult): string {
  return `Owner notification failed via ${result.provider}: ${result.error ?? "Unknown email error."}`;
}

function formatLeadText(record: LeadRecord, via: string): string {
  const lines = [
    `${record.kind === "intro" ? "Contact-help request" : "Profile claim"} submitted for review.`,
    `Do not treat this as an intro already sent. Review first.`,
    "",
    `Manufacturer: ${record.manufacturerName} (${record.manufacturerSlug})`,
    `Source URL: ${record.sourceUrl}`,
    `Submitted: ${record.createdAt}`,
    `Record ID: ${record.id}`,
    `Store path: ${via}`,
    `UTM: ${JSON.stringify(record.utm)}`,
    "",
    "Payload:",
    JSON.stringify(record.payload, null, 2),
  ];
  return lines.join("\n");
}
