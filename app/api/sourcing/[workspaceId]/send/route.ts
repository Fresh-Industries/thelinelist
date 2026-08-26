import { isNotifyConfigured, sendEmail } from "@/lib/notify/email";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getDemoRecipient, packetUrl } from "@/lib/sourcing/outreach";
import { sendInquirySchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { claimInquirySend, getSourcingWorkspace, releaseInquirySend, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return responseError("Workspace not found.", 404);
  let workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) return responseError("Workspace not found.", 404);
  const parsed = sendInquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseError("Invalid send request.", 400);
  const index = workspace.outreachDrafts.findIndex((draft) => draft.id === parsed.data.outreachDraftId);
  if (index < 0) return responseError("Draft not found.", 404);
  const draft = workspace.outreachDrafts[index];
  if (draft.sentAt) return NextResponse.json({ error: "This inquiry was already sent.", workspace }, { status: 409 });
  if (!draft.approvedVersion || draft.approvedVersion !== draft.version || draft.approvedVersion !== parsed.data.approvedContentVersion) {
    return responseError("The visible draft version must be approved before sending.", 409);
  }
  const demoRecipient = getDemoRecipient();
  if (!demoRecipient || !isNotifyConfigured()) {
    return responseError("Safe demo delivery is not configured. Add SOURCING_DEMO_RECIPIENT and an email provider; nothing was sent.", 503);
  }
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-send:${context.ipHash}:${workspaceId}`, limit: 5, windowSec: 60 * 60 });
  if (!limited.ok) return responseError("Send limit reached. Nothing was sent.", 429);
  if (!(await claimInquirySend(draft.id))) return responseError("This approved draft is already being sent or was sent.", 409);

  const result = await sendEmail({
    to: demoRecipient,
    replyTo: workspace.fields.contact_email.status === "confirmed" ? workspace.fields.contact_email.value ?? undefined : undefined,
    subject: `[DEMO for ${draft.manufacturerName}] ${draft.subject}`,
    text: [
      "SAFE DEMO DELIVERY — this message was redirected by The Line List.",
      `Selected manufacturer: ${draft.manufacturerName}`,
      `Approved packet: ${packetUrl(draft.packet.token)}`,
      "",
      draft.body,
    ].join("\n"),
    tags: { kind: "sourcing-demo", slug: draft.manufacturerSlug },
  });

  if (!result.ok) {
    await releaseInquirySend(draft.id);
    const failed = { ...draft, deliveryStatus: "failed" as const, deliveryError: result.error ?? "Email delivery failed.", updatedAt: new Date().toISOString() };
    const drafts = [...workspace.outreachDrafts];
    drafts[index] = failed;
    workspace = addWorkspaceActivity({ ...workspace, outreachDrafts: drafts }, "send_failed", `Demo delivery for ${draft.manufacturerName} failed. Nothing was marked contacted.`);
    await saveSourcingWorkspace(workspace);
    return NextResponse.json({ error: failed.deliveryError, workspace }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const sent = { ...draft, sentAt, deliveryStatus: "sent" as const, deliveryError: null, updatedAt: sentAt };
  const drafts = [...workspace.outreachDrafts];
  drafts[index] = sent;
  workspace = addWorkspaceActivity({
    ...workspace,
    outreachDrafts: drafts,
    inquiries: [{ draftId: draft.id, manufacturerSlug: draft.manufacturerSlug, manufacturerName: draft.manufacturerName, status: "contacted", contactedAt: sentAt, deliveryMethod: "safe_demo_email" }, ...workspace.inquiries],
  }, "sent", `${draft.manufacturerName} marked Contacted after safe demo delivery.`);
  await saveSourcingWorkspace(workspace);
  return NextResponse.json({ workspace, inquiry: workspace.inquiries[0], deliveredTo: demoRecipient });
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
