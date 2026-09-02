import { createHash, randomBytes } from "node:crypto";
import { SourcingStoreUnavailableError, SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { createWorkspace } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { createGuestCredential, setGuestWorkspaceCookie } from "@/lib/sourcing/access";
import { agentFieldUpdateSchema } from "@/lib/sourcing/schemas";
import { SOURCING_FIELD_KEYS } from "@/lib/sourcing/types";

const createWorkspaceSchema = z.object({
  idea: z.string().trim().min(2).max(1_500),
  initialUpdates: z.array(agentFieldUpdateSchema).max(SOURCING_FIELD_KEYS.length).optional(),
  mutationId: z.string().trim().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) return NextResponse.json({ error: "That product idea is too large." }, { status: 413 });
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-create:${context.ipHash}`, limit: process.env.NODE_ENV === "development" ? 500 : 20, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Workspace creation limit reached. Try again later." }, { status: 429 });
  const parsed = createWorkspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tell us a little about the product you want to make." }, { status: 400 });
  const mutationId = parsed.data.mutationId ?? randomBytes(32).toString("base64url");
  const workspaceId = createHash("sha256").update(`workspace:${mutationId}`).digest("base64url").slice(0, 24);
  const workspace = createWorkspace({ id: workspaceId, idea: parsed.data.idea, initialUpdates: parsed.data.initialUpdates });
  const session = await getSession();
  const guest = session?.user.id ? null : createGuestCredential(workspace.id, mutationId);
  let current = await getSourcingWorkspace(workspace.id);
  if (current && current.originalIdea !== parsed.data.idea) {
    return NextResponse.json({
      error: "That creation mutation ID was already used for a different product idea. Start a new mutation instead of overwriting the existing workspace.",
      receipt: {
        authoritative: true,
        mutation: "create_sourcing_workspace",
        outcome: "conflict",
        workspaceId: current.id,
        currentWorkspaceId: current.id,
        revision: current.revision,
        workspaceUrl: `/sourcing/${current.id}`,
      },
    }, { status: 409 });
  }
  let outcome: "created" | "replayed" = current ? "replayed" : "created";
  try {
    if (!current) {
      await saveSourcingWorkspace(workspace, null, {
        userId: session?.user.id ?? null,
        guestTokenHash: guest?.tokenHash ?? null,
        expiresAt: guest?.expiresAt ?? null,
      });
      current = workspace;
    }
  } catch (error) {
    if (error instanceof SourcingStoreUnavailableError) {
      return NextResponse.json(
        { error: "Product-plan storage is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }
    current = await getSourcingWorkspace(workspace.id);
    if (error instanceof SourcingWorkspaceConflictError && !current) {
      return NextResponse.json({ error: "Product plan creation conflicted with another request. Please try again." }, { status: 409 });
    }
    if (!current) throw error;
    outcome = "replayed";
  }
  const receipt = {
    authoritative: true as const,
    mutation: "create_sourcing_workspace" as const,
    outcome,
    workspaceId: current.id,
    currentWorkspaceId: current.id,
    revision: current.revision,
    workspaceUrl: `/sourcing/${current.id}`,
  };
  const response = NextResponse.json({ workspace: current, receipt, storageAdapter: sourcingStoreAdapter() }, { status: outcome === "created" ? 201 : 200 });
  if (guest) setGuestWorkspaceCookie(response, guest);
  return response;
}
