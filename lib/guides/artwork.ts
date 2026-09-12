import artwork from "./artwork.json";

export const GUIDE_ARTWORK: Record<string, { title: string; src: string; alt: string; background: string }> = artwork;

export function guideArtwork(slug: keyof typeof artwork) {
  return artwork[slug];
}
