import { matchManufacturers } from "@/lib/sourcing/matching";
import { hasMinimumMatchingInfo } from "@/lib/sourcing/readiness";
import { matchRequestSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { getSourcingWorkspace, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-match:${context.ipHash}:${workspaceId}`, limit: 60, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Matching limit reached. Try again later." }, { status: 429 });
  const parsed = matchRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid matching request." }, { status: 400 });
  if (!hasMinimumMatchingInfo(workspace)) {
    return NextResponse.json({ error: "I need to learn a little more about your product before I can find useful matches.", workspace, matches: [] }, { status: 409 });
  }
  const matches = matchManufacturers(workspace, parsed.data);
  const updated = addWorkspaceActivity({
    ...workspace,
    matches,
    matchesUpdatedAt: new Date().toISOString(),
  }, "matched", `${matches.length} evidence-backed manufacturer match${matches.length === 1 ? "" : "es"} prepared.`);
  await saveSourcingWorkspace(updated);
  return NextResponse.json({ workspace: updated, matches });
}
