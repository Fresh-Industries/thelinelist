import { getOwnerNotifyAddress, isNotifyConfigured, sendEmail } from "@/lib/notify/email";
import { SITE_NAME } from "@/lib/site";
import type { LeadRecord, LeadStore, StoreResult } from "./types";

const memoryRecords = new Map<string, LeadRecord[]>();

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function blobReady(): boolean {
  return Boolean(read("BLOB_READ_WRITE_TOKEN"));
}

export function getLeadStoreAdapterName(): "blob" | "email-archive" | "memory" {
  if (blobReady()) return "blob";
  if (isNotifyConfigured()) return "email-archive";
  return "memory";
}

export function createLeadStore(): LeadStore {
  return {
    async save(record) {
      if (blobReady()) {
        const blob = await saveToBlob(record);
        if (blob.ok) {
          await notifyOwner(record, "blob");
          return blob;
        }
      }

      if (isNotifyConfigured()) {
        const archived = await saveToEmailArchive(record);
        if (archived.ok) return archived;
      }

      return saveToMemory(record);
    },
    async findRecentDuplicate(fingerprint, withinMs) {
      const local = findMemoryDuplicate(fingerprint, withinMs);
      if (local) return local;
      if (blobReady()) {
        return findBlobDuplicate(fingerprint, withinMs);
      }
      return null;
    },
  };
}

async function saveToBlob(record: LeadRecord): Promise<StoreResult> {
  const pathname = `leads/${record.kind}/${record.createdAt.slice(0, 10)}/${record.id}.json`;
  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${read("BLOB_READ_WRITE_TOKEN")}`,
      "x-api-version": "7",
      "x-content-type": "application/json",
    },
    body: JSON.stringify(record, null, 2),
  });

  if (!response.ok) {
    return {
      ok: false,
      adapter: "blob",
      id: record.id,
      error: `Blob HTTP ${response.status}`,
    };
  }

  remember(record);
  return { ok: true, adapter: "blob", id: record.id };
}

async function findBlobDuplicate(
  fingerprint: string,
  withinMs: number,
): Promise<LeadRecord | null> {
  return findMemoryDuplicate(fingerprint, withinMs);
}

async function saveToEmailArchive(record: LeadRecord): Promise<StoreResult> {
  const notified = await notifyOwner(record, "email-archive");
  if (!notified) {
    return {
      ok: false,
      adapter: "email-archive",
      id: record.id,
      error: "Email archive failed.",
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

async function notifyOwner(record: LeadRecord, via: string): Promise<boolean> {
  if (!isNotifyConfigured()) return false;
  const kindLabel = record.kind === "intro" ? "Introduction request" : "Profile claim";
  const result = await sendEmail({
    to: getOwnerNotifyAddress(),
    subject: `${SITE_NAME}: ${kindLabel} for ${record.manufacturerName}`,
    replyTo: typeof record.payload.email === "string" ? record.payload.email : undefined,
    text: formatLeadText(record, via),
    tags: { kind: record.kind, slug: record.manufacturerSlug },
  });
  return result.ok;
}

function formatLeadText(record: LeadRecord, via: string): string {
  const lines = [
    `${record.kind === "intro" ? "Introduction request" : "Profile claim"} submitted for review.`,
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
