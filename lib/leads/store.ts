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

type NotificationState = "pending" | "sent" | "failed";

export function getLeadStoreAdapterName(): "postgres" | "unconfigured" {
  return databaseConfigured() ? "postgres" : "unconfigured";
}

export function createLeadStore(): LeadStore {
  return {
    async save(record) {
      if (!databaseConfigured()) {
        return {
          ok: false,
          adapter: "unconfigured",
          id: record.id,
          error: "Durable lead storage is not configured. DATABASE_URL is required.",
        };
      }

      const stored = await saveToPostgres(record);
      if (!stored.ok) return stored;
      if (stored.duplicate) {
        console.info("[lead-store] duplicate submission reused", {
          id: record.id,
          kind: record.kind,
          manufacturerSlug: record.manufacturerSlug,
          adapter: "postgres",
        });
        return stored;
      }

      const notified = isNotifyConfigured()
        ? await notifyOwner(record)
        : { ok: false, provider: "none" as const, error: "No email provider configured." };
      const notificationState: NotificationState = notified.ok ? "sent" : "failed";
      await updateNotificationState(record, notificationState, notified);

      console.info("[lead-store] submission processed", {
        id: record.id,
        kind: record.kind,
        manufacturerSlug: record.manufacturerSlug,
        adapter: "postgres",
        notificationState,
        notificationProvider: notified.provider,
      });

      return {
        ...stored,
        ok: true,
        notificationState,
        notificationProvider: notified.provider,
      };
    },
    async findRecentDuplicate(fingerprint, withinMs) {
      if (!databaseConfigured()) return null;
      return findPostgresDuplicate(fingerprint, withinMs);
    },
  };
}

async function saveToPostgres(record: LeadRecord): Promise<StoreResult> {
  try {
    await prisma.leadSubmission.create({
      data: {
        id: record.id,
        kind: record.kind,
        manufacturerSlug: record.manufacturerSlug,
        manufacturerName: record.manufacturerName,
        sourceUrl: record.sourceUrl,
        utm: record.utm as unknown as Prisma.InputJsonValue,
        payload: withNotificationState(record.payload, "pending", record.createdAt) as Prisma.InputJsonValue,
        fingerprint: record.fingerprint,
        createdAt: new Date(record.createdAt),
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        ok: true,
        duplicate: true,
        adapter: "postgres",
        id: record.id,
        notificationState: "pending",
      };
    }
    return {
      ok: false,
      adapter: "postgres",
      id: record.id,
      error: databaseFailure(error),
    };
  }
  return { ok: true, adapter: "postgres", id: record.id, notificationState: "pending" };
}

async function updateNotificationState(
  record: LeadRecord,
  state: NotificationState,
  result: NotifyResult,
): Promise<void> {
  try {
    await prisma.leadSubmission.update({
      where: { id: record.id },
      data: {
        payload: withNotificationState(
          record.payload,
          state,
          new Date().toISOString(),
          result.provider,
          result.error,
        ) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[lead-store] notification state update failed", {
      id: record.id,
      kind: record.kind,
      manufacturerSlug: record.manufacturerSlug,
      notificationState: state,
      error: databaseFailure(error),
    });
  }
}

function withNotificationState(
  payload: Record<string, unknown>,
  state: NotificationState,
  updatedAt: string,
  provider: NotifyResult["provider"] = "none",
  error?: string,
): Record<string, unknown> {
  const metadata = isRecord(payload._lead) ? payload._lead : {};
  return {
    ...payload,
    _lead: {
      ...metadata,
      status: "received",
      notification: {
        state,
        provider,
        updatedAt,
        ...(error ? { errorCode: provider === "none" ? "NOT_CONFIGURED" : "DELIVERY_FAILED" } : {}),
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUniqueConflict(error: unknown): boolean {
  return isRecord(error) && error.code === "P2002";
}

function databaseFailure(error: unknown): string {
  const code = isRecord(error) && typeof error.code === "string" ? error.code : null;
  return code ? `PostgreSQL write failed (${code})` : "PostgreSQL write failed";
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

async function notifyOwner(record: LeadRecord): Promise<NotifyResult> {
  const kindLabel = record.kind === "intro" ? "Contact-help request" : "Profile claim";
  const replyTo = [record.payload.email, record.payload.workEmail].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return sendEmail({
    to: getOwnerNotifyAddress(),
    subject: `${SITE_NAME}: ${kindLabel} for ${record.manufacturerName}`,
    replyTo,
    text: formatLeadText(record),
    tags: { kind: record.kind, slug: record.manufacturerSlug },
    idempotencyKey: `lead-${record.id}`,
  });
}

function formatLeadText(record: LeadRecord): string {
  return [
    `${record.kind === "intro" ? "Contact-help request" : "Profile claim"} submitted for review.`,
    "Do not treat this as an intro already sent. Review first.",
    "",
    `Manufacturer: ${record.manufacturerName} (${record.manufacturerSlug})`,
    `Source URL: ${record.sourceUrl}`,
    `Submitted: ${record.createdAt}`,
    `Record ID: ${record.id}`,
    "Store path: postgres",
    `UTM: ${JSON.stringify(record.utm)}`,
    "",
    "Payload:",
    JSON.stringify(record.payload, null, 2),
  ].join("\n");
}
