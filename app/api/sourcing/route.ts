import { SourcingStoreUnavailableError, SourcingWorkspaceConflictError, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { createWorkspace } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { getSession } from "@/lib/auth/server";
import { createGuestCredential, setGuestWorkspaceCookie } from "@/lib/sourcing/access";

const createWorkspaceSchema = z.object({ idea: z.string().trim().min(2).max(1_500) });

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) return NextResponse.json({ error: "That product idea is too large." }, { status: 413 });
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-create:${context.ipHash}`, limit: process.env.NODE_ENV === "development" ? 500 : 20, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Workspace creation limit reached. Try again later." }, { status: 429 });
  const parsed = createWorkspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tell us a little about the product you want to make." }, { status: 400 });
  const workspace = createWorkspace({ idea: parsed.data.idea });
  const session = await getSession();
  const guest = session?.user.id ? null : createGuestCredential(workspace.id);
  try {
    await saveSourcingWorkspace(workspace, null, {
      userId: session?.user.id ?? null,
      guestTokenHash: guest?.tokenHash ?? null,
      expiresAt: guest?.expiresAt ?? null,
    });
  } catch (error) {
    if (error instanceof SourcingStoreUnavailableError) {
      return NextResponse.json(
        { error: "Product-plan storage is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }
    if (error instanceof SourcingWorkspaceConflictError) {
      return NextResponse.json({ error: "Product plan creation conflicted with another request. Please try again." }, { status: 409 });
    }
    throw error;
  }
  const response = NextResponse.json({ workspace, storageAdapter: sourcingStoreAdapter() }, { status: 201 });
  if (guest) setGuestWorkspaceCookie(response, guest);
  return response;
}
