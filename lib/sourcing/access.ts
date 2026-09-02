import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import { getSourcingWorkspace, getWorkspaceOwnership, hashOpaqueToken } from "./store";
import type { SourcingWorkspace } from "./types";

const LEGACY_GUEST_COOKIE = "tll_guest_workspace";
const GUEST_COOKIE_PREFIX = "tll_guest_workspace_";
const GUEST_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface GuestCredential {
  workspaceId: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function guestWorkspaceCookieName(workspaceId: string): string {
  return `${GUEST_COOKIE_PREFIX}${workspaceId}`;
}

export function createGuestCredential(workspaceId: string, creationMutationId?: string): GuestCredential {
  const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (creationMutationId && !configuredSecret && process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required for idempotent guest workspace creation.");
  }
  const token = creationMutationId
    ? createHmac("sha256", configuredSecret || "the-line-list-local-guest-credential")
        .update(`guest:${workspaceId}:${creationMutationId}`)
        .digest("base64url")
    : randomBytes(32).toString("base64url");
  return {
    workspaceId,
    token,
    tokenHash: hashOpaqueToken(token),
    expiresAt: new Date(Date.now() + GUEST_TTL_SECONDS * 1_000),
  };
}

export function setGuestWorkspaceCookie(response: NextResponse, credential: GuestCredential): void {
  response.cookies.set(guestWorkspaceCookieName(credential.workspaceId), credential.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_TTL_SECONDS,
    priority: "high",
  });
}

export function clearGuestWorkspaceCookie(response: NextResponse, workspaceId?: string): void {
  if (workspaceId) response.cookies.set(guestWorkspaceCookieName(workspaceId), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(LEGACY_GUEST_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function readGuestCredential(workspaceId: string): Promise<{ workspaceId: string; token: string } | null> {
  const cookieStore = await cookies();
  const scopedToken = cookieStore.get(guestWorkspaceCookieName(workspaceId))?.value;
  if (scopedToken) return { workspaceId, token: scopedToken };
  const value = cookieStore.get(LEGACY_GUEST_COOKIE)?.value;
  if (!value) return null;
  const separator = value.indexOf(".");
  if (separator < 1) return null;
  return { workspaceId: value.slice(0, separator), token: value.slice(separator + 1) };
}

function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getAuthorizedWorkspace(workspaceId: string): Promise<{
  workspace: SourcingWorkspace;
  access: "user" | "guest" | "development";
} | null> {
  const [workspace, ownership, session, guest] = await Promise.all([
    getSourcingWorkspace(workspaceId),
    getWorkspaceOwnership(workspaceId),
    getSession(),
    readGuestCredential(workspaceId),
  ]);
  if (!workspace || !ownership) return null;

  if (!databaseConfigured() && process.env.NODE_ENV !== "production") {
    return { workspace, access: "development" };
  }
  if (ownership.userId && session?.user.id === ownership.userId) {
    return { workspace, access: "user" };
  }
  if (
    !ownership.userId &&
    ownership.guestTokenHash &&
    guest?.workspaceId === workspaceId &&
    (!ownership.expiresAt || ownership.expiresAt > new Date()) &&
    hashesMatch(hashOpaqueToken(guest.token), ownership.guestTokenHash)
  ) {
    return { workspace, access: "guest" };
  }
  return null;
}

export async function claimGuestWorkspace(workspaceId: string): Promise<"claimed" | "unauthenticated" | "forbidden"> {
  if (!databaseConfigured()) return "forbidden";
  const [session, guest] = await Promise.all([getSession(), readGuestCredential(workspaceId)]);
  if (!session?.user.id) return "unauthenticated";
  if (!guest || guest.workspaceId !== workspaceId) return "forbidden";
  const guestTokenHash = hashOpaqueToken(guest.token);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.productWorkspace.updateMany({
      where: {
        id: workspaceId,
        userId: null,
        guestTokenHash,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: {
        userId: session.user.id,
        guestTokenHash: null,
        expiresAt: null,
        claimedAt: new Date(),
      },
    });
    if (claimed.count !== 1) return "forbidden" as const;
    await tx.workspaceActivity.create({
      data: {
        workspaceId,
        actor: "FOUNDER",
        kind: "claimed",
        summary: "Product workspace saved to the founder account.",
      },
    });
    return "claimed" as const;
  });
}
