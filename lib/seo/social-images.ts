import images from "./social-images.generated.json";
import { absoluteUrl } from "@/lib/site";

const catalog: Record<string, { url: string; width: number; height: number; alt: string }> = images;

/** Only public, checked-in page identities enter social previews. No workspace data. */
export function socialImageForPage(path: string) {
  const route = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const image = catalog[route] ?? catalog["/"];
  return { ...image, url: absoluteUrl(image.url), type: "image/jpeg" };
}
