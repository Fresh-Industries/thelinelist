import Image from "next/image";
import { GUIDE_ARTWORK } from "@/lib/guides/artwork";

/** Compact artwork for the older process guides and the cost worksheet. */
export function GuideCover({ slug }: { slug: string }) {
  const artwork = GUIDE_ARTWORK[slug];
  if (!artwork) throw new Error(`Guide artwork missing for ${slug}`);
  return (
    <figure className="standalone-guide-cover" style={{ backgroundColor: artwork.background }}>
      <Image src={artwork.src} alt={artwork.alt} width={960} height={960} sizes="(max-width: 760px) 100vw, 38rem" priority />
    </figure>
  );
}
