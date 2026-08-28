import { randomUUID } from "node:crypto";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { workspaceIdSchema } from "@/lib/sourcing/schemas";
import { artworkStoreReady, saveProductArtwork, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { databaseConfigured, prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_ARTWORK_BYTES = 2_000_000;

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return responseError("Product plan not found.", 404);
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return responseError("Product plan not found.", 404);
  const workspace = authorized.workspace;
  if (!artworkStoreReady()) return responseError("Artwork storage is not configured for this environment.", 503);

  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-artwork:${context.ipHash}:${workspaceId}`, limit: 20, windowSec: 60 * 60 });
  if (!limited.ok) return responseError("Artwork upload limit reached. Try again later.", 429);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("artwork");
  if (!(file instanceof File)) return responseError("Choose a PNG, JPG, or WebP image.", 400);
  if (!ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_ARTWORK_BYTES) {
    return responseError("Artwork must be a PNG, JPG, or WebP image smaller than 2 MB.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type)) return responseError("The selected file does not appear to be a valid image.", 400);

  const artwork = {
    id: randomUUID(),
    fileName: file.name.slice(0, 200),
    contentType: file.type as "image/png" | "image/jpeg" | "image/webp",
    byteSize: file.size,
    createdAt: new Date().toISOString(),
  };
  const blobPath = await saveProductArtwork(workspace.id, artwork.id, bytes, artwork.contentType);
  if (databaseConfigured()) {
    await prisma.workspaceAsset.create({
      data: { ...artwork, workspaceId: workspace.id, blobPath, createdAt: new Date(artwork.createdAt) },
    });
  }
  const updated = addWorkspaceActivity({ ...workspace, artwork }, "artwork_attached", "Your artwork was added to the product preview.");
  await saveSourcingWorkspace(updated, workspace.revision);
  return NextResponse.json({ workspace: updated, artworkUrl: `/api/sourcing/${workspace.id}/artwork/${artwork.id}` }, { status: 201 });
}

function matchesImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
