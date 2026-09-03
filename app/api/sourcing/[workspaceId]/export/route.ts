import { NextResponse } from "next/server";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { normalizeTimeZone } from "@/lib/sourcing/date-format";
import { createProductPlanPdf } from "@/lib/sourcing/export-pdf";
import { getProductName } from "@/lib/sourcing/product-catalog";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const timeZone = normalizeTimeZone(new URL(request.url).searchParams.get("timeZone"));
  const bytes = await createProductPlanPdf(authorized.workspace, { timeZone });
  const filename = `${slug(getProductName(authorized.workspace)) || "product"}-manufacturer-plan.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
