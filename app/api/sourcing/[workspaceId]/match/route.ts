import { matchManufacturers } from "@/lib/sourcing/matching";
import { getSourcingReadiness, hasMinimumMatchingInfo } from "@/lib/sourcing/readiness";
import { matchRequestSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { applyManufacturerResearch, getCurrentManufacturerResearch } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const workspace = authorized.workspace;
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-match:${context.ipHash}:${workspaceId}`, limit: 60, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Matching limit reached. Try again later." }, { status: 429 });
  const parsed = matchRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const detail = parsed.error.issues[0];
    const field = detail?.path.length ? ` for ${detail.path.join(".")}` : "";
    return NextResponse.json({ error: `Invalid matching request${field}: ${detail?.message ?? "check the supplied filters"}.` }, { status: 400 });
  }
  if (!hasMinimumMatchingInfo(workspace)) {
    return NextResponse.json({ error: "Your plan needs a little more detail before a useful manufacturer search.", workspace, readiness: getSourcingReadiness(workspace), matches: [] }, { status: 409 });
  }
  const matches = matchManufacturers(workspace, parsed.data);
  const researchRequest = {
    geographyPreference: parsed.data.geographyPreference ?? null,
    resultLimit: parsed.data.resultLimit,
    requiredRequirements: [...new Set(parsed.data.requiredRequirements ?? [])].sort(),
    preferredRequirements: [...new Set(parsed.data.preferredRequirements ?? [])].sort(),
  };
  const updated = applyManufacturerResearch(workspace, researchRequest, matches);
  try {
    await saveSourcingWorkspace(updated, workspace.revision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  const persisted = await getSourcingWorkspace(workspaceId);
  const research = persisted ? getCurrentManufacturerResearch(persisted) : null;
  if (!persisted || !research) {
    return NextResponse.json({ error: "Manufacturer research was not persisted consistently. Read the current workspace before retrying." }, { status: 409 });
  }
  return NextResponse.json({
    workspace: persisted,
    readiness: getSourcingReadiness(persisted),
    matches: research.candidates,
    manufacturerResearch: research,
    receipt: {
      authoritative: true,
      mutation: "match_manufacturers",
      outcome: "persisted",
      workspaceId,
      revision: persisted.revision,
      researchId: research.id,
      planFingerprint: research.planFingerprint,
      resultCount: research.candidateCount,
    },
  });
}
