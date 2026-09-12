import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

// Keep existing shared URLs working without a file-metadata override of page-specific images.
export async function GET() {
  const bytes = await readFile(join(process.cwd(), "public/images/og/home.jpg"));
  return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" } });
}
