import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { claimGuestWorkspace, clearGuestWorkspaceCookie } from "@/lib/sourcing/access";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) {
    return NextResponse.json({ error: "Product workspace not found." }, { status: 404 });
  }
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-claim:${context.ipHash}:${workspaceId}`, limit: 20, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many save attempts. Try again later." }, { status: 429 });

  const result = await claimGuestWorkspace(workspaceId);
  if (result === "unauthenticated") return NextResponse.json({ error: "Sign in before saving this product." }, { status: 401 });
  if (result === "forbidden") return NextResponse.json({ error: "This product could not be saved to your account." }, { status: 403 });

  const response = NextResponse.json({ claimed: true, workspaceId });
  clearGuestWorkspaceCookie(response, workspaceId);
  return response;
}
