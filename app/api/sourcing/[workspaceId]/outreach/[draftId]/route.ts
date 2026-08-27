import { editAndApproveDraft } from "@/lib/sourcing/outreach";
import { editDraftSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceId: string; draftId: string }> }) {
  const { workspaceId, draftId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-approve:${context.ipHash}:${workspaceId}`, limit: 60, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Approval update limit reached. Try again later." }, { status: 429 });
  const index = workspace.outreachDrafts.findIndex((draft) => draft.id === draftId);
  if (index < 0) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const parsed = editDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the subject, message, and shared fields." }, { status: 400 });
  let draft;
  try {
    draft = editAndApproveDraft(workspace.outreachDrafts[index], workspace, parsed.data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Draft could not be approved." }, { status: 400 });
  }
  const drafts = [...workspace.outreachDrafts];
  drafts[index] = draft;
  const updated = addWorkspaceActivity({ ...workspace, outreachDrafts: drafts }, "approved", `Founder approved outreach version ${draft.version} for ${draft.manufacturerName}.`);
  try {
    await saveSourcingWorkspace(updated, workspace.revision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ workspace: updated, draft });
}
