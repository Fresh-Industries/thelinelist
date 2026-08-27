import { isNotifyConfigured, sendEmail } from "@/lib/notify/email";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { packetUrl, resolveApprovedDeliveryRecipient, validateHumanSendToken } from "@/lib/sourcing/outreach";
import { contactEmailSchema, sendInquirySchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, claimInquirySend, getSourcingWorkspace, releaseInquirySend, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return responseError("Workspace not found.", 404);
  let workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) return responseError("Workspace not found.", 404);
  const expectedRevision = workspace.revision;
  const parsed = sendInquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseError("Invalid send request.", 400);
  const index = workspace.outreachDrafts.findIndex((draft) => draft.id === parsed.data.outreachDraftId);
  if (index < 0) return responseError("Draft not found.", 404);
  const draft = workspace.outreachDrafts[index];
  if (draft.sentAt) return NextResponse.json({ error: "This inquiry was already sent.", workspace }, { status: 409 });
  if (!draft.approvedVersion || draft.approvedVersion !== draft.version || draft.approvedVersion !== parsed.data.approvedContentVersion) {
    return responseError("The visible draft version must be approved before sending.", 409);
  }
  if (!validateHumanSendToken(draft, parsed.data.humanSendToken)) {
    return responseError("Return to the final review and click the send button yourself. The approval window may have expired.", 409);
  }
  const founderCopyEmail = draft.founderCopyEmail;
  if (!founderCopyEmail || !contactEmailSchema.safeParse(founderCopyEmail).success) {
    return responseError("Return to final review and approve a valid founder email before sending.", 409);
  }
  if (workspace.fields.contact_email.status !== "confirmed" || workspace.fields.contact_email.value !== founderCopyEmail) {
    return responseError("Your founder email changed after approval. Return to final review and approve the updated introduction.", 409);
  }

  const delivery = resolveApprovedDeliveryRecipient(draft);
  if (!delivery.ok) return responseError(delivery.error, delivery.status);
  const recipient = delivery.recipient;
  if (!isNotifyConfigured()) {
    return responseError("Introduction delivery is not configured. Nothing was sent.", 503);
  }
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-send:${context.ipHash}:${workspaceId}`, limit: 5, windowSec: 60 * 60 });
  if (!limited.ok) return responseError("Send limit reached. Nothing was sent.", 429);
  if (!(await claimInquirySend(draft.id))) return responseError("This approved draft is already being sent or was sent.", 409);

  const result = await sendEmail({
    from: process.env.SOURCING_FROM_EMAIL?.trim() || "The Line List Introductions <introductions@mail.thelinelist.com>",
    to: recipient,
    cc: draft.availableDeliveryMethod === "line_list_introduction" ? founderCopyEmail : undefined,
    replyTo: founderCopyEmail,
    subject: draft.availableDeliveryMethod === "safe_demo_email" ? `[SAFE DEMO for ${draft.manufacturerName}] ${draft.subject}` : draft.subject,
    text: draft.availableDeliveryMethod === "safe_demo_email" ? [
      "SAFE DEMO DELIVERY — this message was redirected by The Line List.",
      `Selected manufacturer: ${draft.manufacturerName}`,
      `Approved packet: ${packetUrl(draft.packet.token)}`,
      "",
      draft.body,
    ].join("\n") : draft.body,
    tags: { kind: draft.availableDeliveryMethod === "safe_demo_email" ? "sourcing-demo" : "sourcing-introduction", slug: draft.manufacturerSlug },
  });

  if (!result.ok) {
    await releaseInquirySend(draft.id);
    const failed = { ...draft, deliveryStatus: "failed" as const, deliveryError: result.error ?? "Email delivery failed.", updatedAt: new Date().toISOString() };
    const drafts = [...workspace.outreachDrafts];
    drafts[index] = failed;
    const deliveryLabel = draft.availableDeliveryMethod === "line_list_introduction" ? "Live introduction" : "Safe demo delivery";
    workspace = addWorkspaceActivity({ ...workspace, outreachDrafts: drafts }, "send_failed", `${deliveryLabel} for ${draft.manufacturerName} failed. Nothing was marked contacted.`);
    try {
      await saveSourcingWorkspace(workspace, expectedRevision);
    } catch (error) {
      if (error instanceof SourcingWorkspaceConflictError) return responseError(error.message, 409);
      throw error;
    }
    return NextResponse.json({ error: failed.deliveryError, workspace }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const sent = { ...draft, sentAt, deliveryStatus: "sent" as const, deliveryError: null, updatedAt: sentAt };
  const drafts = [...workspace.outreachDrafts];
  drafts[index] = sent;
  workspace = addWorkspaceActivity({
    ...workspace,
    outreachDrafts: drafts,
    inquiries: [{
      draftId: draft.id,
      manufacturerSlug: draft.manufacturerSlug,
      manufacturerName: draft.manufacturerName,
      status: "contacted",
      contactedAt: sentAt,
      deliveryMethod: draft.availableDeliveryMethod === "line_list_introduction" ? "line_list_introduction" : "safe_demo_email",
      deliveredTo: recipient,
      founderCopied: draft.availableDeliveryMethod === "line_list_introduction" ? founderCopyEmail : null,
    }, ...workspace.inquiries],
  }, "sent", `${draft.manufacturerName} marked Contacted after the approved introduction was delivered.`);
  try {
    await saveSourcingWorkspace(workspace, expectedRevision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) {
      return responseError("The inquiry was delivered, but another workspace update prevented its status from being saved. Do not resend it.", 409);
    }
    throw error;
  }
  return NextResponse.json({ workspace, inquiry: workspace.inquiries[0], deliveredTo: recipient, founderCopied: draft.availableDeliveryMethod === "line_list_introduction" ? founderCopyEmail : null });
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
