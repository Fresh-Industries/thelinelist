import "server-only";

import { BlobNotFoundError, get, put } from "@vercel/blob";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import { ProductPlanSchema, productPlanFromWorkspace } from "./product-plan";
import { getProductName } from "./product-catalog";
import type { SourcingWorkspace, WorkspaceActivity } from "./types";
import { normalizeWorkspace } from "./workspace";

const localStoreDirectory = join(tmpdir(), "thelinelist-sourcing-workspaces");
const localWorkspaceLocks = new Map<string, Promise<void>>();

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function blobReady(): boolean {
  return Boolean(
    read("BLOB_READ_WRITE_TOKEN") ||
      (read("BLOB_STORE_ID") && (read("VERCEL_OIDC_TOKEN") || read("VERCEL") === "1")),
  );
}

function fileStoreReady(): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const databaseUrl = read("DATABASE_URL");
  const isLocalDatabase = /@(localhost|127\.0\.0\.1)(?::|\/)/i.test(databaseUrl);
  return read("E2E_ALLOW_LOCAL_ARTWORK_STORE") === "1" && isLocalDatabase && read("VERCEL") !== "1";
}

function blobArtworkPath(workspaceId: string, artworkId: string): string {
  return `sourcing/artwork/${workspaceId}/${artworkId}`;
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class SourcingStoreUnavailableError extends Error {
  constructor() {
    super("Persistent sourcing storage is not configured.");
    this.name = "SourcingStoreUnavailableError";
  }
}

export class SourcingWorkspaceConflictError extends Error {
  constructor() {
    super("The workspace changed. Refresh and try again.");
    this.name = "SourcingWorkspaceConflictError";
  }
}

export function sourcingStoreAdapter(): "postgres" | "filesystem" | "unavailable" {
  if (databaseConfigured()) return "postgres";
  if (fileStoreReady()) return "filesystem";
  return "unavailable";
}

export function artworkStoreReady(): boolean {
  return blobReady() || fileStoreReady();
}

export async function saveProductArtwork(
  workspaceId: string,
  artworkId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const pathname = blobArtworkPath(workspaceId, artworkId);
  if (blobReady()) {
    await put(pathname, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType,
    });
    return pathname;
  }
  if (fileStoreReady()) {
    await mkdir(join(localStoreDirectory, "artwork", workspaceId), { recursive: true });
    await writeFile(join(localStoreDirectory, "artwork", workspaceId, artworkId), bytes, { mode: 0o600 });
    return pathname;
  }
  throw new SourcingStoreUnavailableError();
}

export async function getProductArtwork(workspaceId: string, artworkId: string): Promise<Uint8Array | null> {
  if (blobReady()) {
    try {
      const result = await get(blobArtworkPath(workspaceId, artworkId), { access: "private", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return new Uint8Array(await new Response(result.stream).arrayBuffer());
    } catch (error) {
      if (error instanceof BlobNotFoundError || (error instanceof Error && error.name === "BlobNotFoundError")) return null;
      throw error;
    }
  }
  if (fileStoreReady()) {
    try {
      return new Uint8Array(await readFile(join(localStoreDirectory, "artwork", workspaceId, artworkId)));
    } catch {
      return null;
    }
  }
  return null;
}

export function packetIsActive(packet: { expiresAt: string; revokedAt: string | null }): boolean {
  return !packet.revokedAt && Date.parse(packet.expiresAt) > Date.now();
}

function actorForActivity(kind: WorkspaceActivity["kind"]): "FOUNDER" | "AGENT" | "SYSTEM" {
  if (kind === "founder_updated" || kind === "agent_undone" || kind === "approved" || kind === "research_broadened") return "FOUNDER";
  if (kind === "agent_proposed" || kind === "matched" || kind === "drafted") return "AGENT";
  return "SYSTEM";
}

function displayName(workspace: SourcingWorkspace): string {
  return getProductName(workspace);
}

function rowToWorkspace(row: {
  id: string;
  userId: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  plan: unknown;
  activities: Array<{ id: string; kind: string; summary: string; details: unknown; createdAt: Date }>;
}): SourcingWorkspace | null {
  const parsed = ProductPlanSchema.safeParse(row.plan);
  if (!parsed.success) return null;
  const research = parsed.data.manufacturerResearch;
  return normalizeWorkspace({
    id: row.id,
    ownership: { userId: row.userId, brandId: null },
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...parsed.data,
    matches: research?.candidates ?? [],
    matchesUpdatedAt: research?.ranAt ?? null,
    activity: row.activities.map((item) => ({
      id: item.id,
      kind: item.kind as WorkspaceActivity["kind"],
      message: item.summary,
      at: item.createdAt.toISOString(),
      details: item.details && typeof item.details === "object" && !Array.isArray(item.details)
        ? item.details as Record<string, unknown>
        : null,
    })),
  });
}

export async function getSourcingWorkspace(id: string): Promise<SourcingWorkspace | null> {
  if (databaseConfigured()) {
    const row = await prisma.productWorkspace.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    return row ? rowToWorkspace(row) : null;
  }
  if (fileStoreReady()) {
    try {
      return normalizeWorkspace(JSON.parse(await readFile(join(localStoreDirectory, `${id}.json`), "utf8")) as SourcingWorkspace);
    } catch {
      return null;
    }
  }
  return null;
}

export async function getWorkspaceOwnership(id: string): Promise<{
  userId: string | null;
  guestTokenHash: string | null;
  expiresAt: Date | null;
} | null> {
  if (!databaseConfigured()) return fileStoreReady() ? { userId: null, guestTokenHash: null, expiresAt: null } : null;
  return prisma.productWorkspace.findUnique({
    where: { id },
    select: { userId: true, guestTokenHash: true, expiresAt: true },
  });
}

export async function saveSourcingWorkspace(
  workspace: SourcingWorkspace,
  expectedRevision: number | null,
  ownership?: { userId?: string | null; guestTokenHash?: string | null; expiresAt?: Date | null },
): Promise<void> {
  const normalized = normalizeWorkspace(workspace);
  const plan = productPlanFromWorkspace(normalized) as unknown as Prisma.InputJsonValue;
  if (databaseConfigured()) {
    await prisma.$transaction(async (tx) => {
      if (expectedRevision === null) {
        await tx.productWorkspace.create({
          data: {
            id: normalized.id,
            userId: ownership?.userId ?? normalized.ownership.userId,
            guestTokenHash: ownership?.guestTokenHash ?? null,
            expiresAt: ownership?.expiresAt ?? null,
            revision: normalized.revision,
            name: displayName(normalized),
            category: normalized.fields.product_category.value,
            plan,
            updatedAt: new Date(normalized.updatedAt),
          },
        });
      } else {
        const updated = await tx.productWorkspace.updateMany({
          where: { id: normalized.id, revision: expectedRevision },
          data: {
            revision: normalized.revision,
            name: displayName(normalized),
            category: normalized.fields.product_category.value,
            plan,
            updatedAt: new Date(normalized.updatedAt),
          },
        });
        if (updated.count !== 1) throw new SourcingWorkspaceConflictError();
      }

      await tx.workspaceActivity.createMany({
        data: normalized.activity.map((item) => ({
          id: item.id,
          workspaceId: normalized.id,
          actor: actorForActivity(item.kind),
          kind: item.kind,
          summary: item.message,
          details: item.details ? item.details as Prisma.InputJsonValue : undefined,
          createdAt: new Date(item.at),
        })),
        skipDuplicates: true,
      });

      await Promise.all(normalized.outreachDrafts.map((draft) => {
        const packet = draft.packet;
        const packetTokenHash = hashOpaqueToken(packet.token);
        return tx.manufacturerPacket.upsert({
          where: { tokenHash: packetTokenHash },
          create: {
            workspaceId: normalized.id,
            tokenHash: packetTokenHash,
            snapshot: packet as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(packet.expiresAt),
            revokedAt: packet.revokedAt ? new Date(packet.revokedAt) : null,
          },
          update: {
            snapshot: packet as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(packet.expiresAt),
            revokedAt: packet.revokedAt ? new Date(packet.revokedAt) : null,
          },
        });
      }));
    });
    return;
  }
  if (fileStoreReady()) {
    await withLocalWorkspaceLock(normalized.id, async () => {
      await mkdir(localStoreDirectory, { recursive: true });
      const workspacePath = join(localStoreDirectory, `${normalized.id}.json`);
      if (expectedRevision !== null) {
        try {
          const current = JSON.parse(await readFile(workspacePath, "utf8")) as SourcingWorkspace;
          if (current.revision !== expectedRevision) throw new SourcingWorkspaceConflictError();
        } catch (error) {
          if (error instanceof SourcingWorkspaceConflictError) throw error;
          throw new SourcingWorkspaceConflictError();
        }
      }
      const temporaryPath = join(localStoreDirectory, `${normalized.id}.${randomUUID()}.tmp`);
      const { matches: _derivedMatches, matchesUpdatedAt: _derivedMatchesUpdatedAt, ...persistedWorkspace } = normalized;
      await writeFile(temporaryPath, JSON.stringify(persistedWorkspace), { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, workspacePath);
    });
    return;
  }
  throw new SourcingStoreUnavailableError();
}

async function withLocalWorkspaceLock<T>(workspaceId: string, operation: () => Promise<T>): Promise<T> {
  const previous = localWorkspaceLocks.get(workspaceId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => gate);
  localWorkspaceLocks.set(workspaceId, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (localWorkspaceLocks.get(workspaceId) === queued) localWorkspaceLocks.delete(workspaceId);
  }
}

export async function getWorkspaceByPacketToken(token: string): Promise<SourcingWorkspace | null> {
  if (databaseConfigured()) {
    const packet = await prisma.manufacturerPacket.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      select: { workspaceId: true, expiresAt: true, revokedAt: true },
    });
    if (!packet || packet.revokedAt || packet.expiresAt <= new Date()) return null;
    return getSourcingWorkspace(packet.workspaceId);
  }
  if (!fileStoreReady()) return null;
  const entries = await readdir(localStoreDirectory).catch(() => []);
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const workspace = await getSourcingWorkspace(entry.slice(0, -5));
    if (workspace?.outreachDrafts.some((draft) => draft.packet.token === token)) return workspace;
  }
  return null;
}
