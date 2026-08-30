import { prepareOutreachDrafts } from "@/lib/sourcing/outreach";
import { prepareOutreachSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const workspace = authorized.workspace;
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-draft:${context.ipHash}:${workspaceId}`, limit: 30, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Outreach draft limit reached. Try again later." }, { status: 429 });
  const parsed = prepareOutreachSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid outreach request." }, { status: 400 });
  const requested = [...parsed.data.selectedManufacturerIds].sort();
  const founderSelected = [...workspace.selectedManufacturerSlugs].sort();
  if (!founderSelected.length || requested.length !== founderSelected.length || requested.some((slug, index) => slug !== founderSelected[index])) {
    return NextResponse.json({ error: "The founder must select these manufacturers in the workspace before any introduction drafts can be prepared." }, { status: 409 });
  }
  const readiness = getSourcingReadiness(workspace);
  if (!readiness.manufacturerReady) {
    return NextResponse.json({
      error: readiness.packageDesignRequired && !readiness.packageDesignReady
        ? "Review and save the packaging direction in the 3D workbench before preparing a manufacturer introduction."
        : "Finish the manufacturer-ready brief before preparing an introduction.",
      workspace,
      readiness,
    }, { status: 409 });
  }
  const drafts = prepareOutreachDrafts(workspace, parsed.data);
  if (!drafts.length) return NextResponse.json({ error: "No available manufacturer introduction could be prepared." }, { status: 400 });
  const updated = addWorkspaceActivity({
    ...workspace,
    selectedManufacturerSlugs: parsed.data.selectedManufacturerIds,
    outreachDrafts: [...drafts, ...workspace.outreachDrafts],
  }, "drafted", `${drafts.length} personalized outreach draft${drafts.length === 1 ? "" : "s"} prepared. Nothing was sent.`);
  try {
    await saveSourcingWorkspace(updated, workspace.revision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ workspace: updated, drafts }, { status: 201 });
}
