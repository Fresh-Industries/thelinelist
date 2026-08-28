import { workspaceIdSchema } from "@/lib/sourcing/schemas";
import { getProductArtwork } from "@/lib/sourcing/store";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceId: string; artworkId: string }> }) {
  const { workspaceId, artworkId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return new Response("Not found", { status: 404 });
  const workspace = (await getAuthorizedWorkspace(workspaceId))?.workspace;
  if (!workspace?.artwork || workspace.artwork.id !== artworkId) return new Response("Not found", { status: 404 });
  const bytes = await getProductArtwork(workspaceId, artworkId);
  if (!bytes) return new Response("Not found", { status: 404 });
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": workspace.artwork.contentType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
