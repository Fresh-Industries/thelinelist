import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";
import { artworkStoreReady, saveProductArtwork } from "@/lib/sourcing/store";

export const dynamic = "force-dynamic";

const MAX_PREVIEW_BYTES = 4_000_000;

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return responseError("Product plan not found.", 404);
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return responseError("Product plan not found.", 404);
  if (!artworkStoreReady()) return responseError("Package-preview storage is not configured for this environment.", 503);

  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-package-preview:${context.ipHash}:${workspaceId}`, limit: 30, windowSec: 60 * 60 });
  if (!limited.ok) return responseError("Package-preview upload limit reached. Try again later.", 429);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("preview");
  if (!(file instanceof File) || file.type !== "image/png" || file.size === 0 || file.size > MAX_PREVIEW_BYTES) {
    return responseError("The package preview must be a PNG image smaller than 4 MB.", 400);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return responseError("The package preview is not a valid PNG image.", 400);
  }

  const previewAssetId = randomUUID();
  const createdAt = new Date();
  const blobPath = await saveProductArtwork(workspaceId, previewAssetId, bytes, "image/png");
  if (databaseConfigured()) {
    await prisma.workspaceAsset.create({
      data: {
        id: previewAssetId,
        workspaceId,
        fileName: "package-preview.png",
        contentType: "image/png",
        byteSize: file.size,
        blobPath,
        createdAt,
      },
    });
  }
  return NextResponse.json({ previewAssetId }, { status: 201 });
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
