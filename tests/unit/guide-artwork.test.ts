import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { GUIDE_ARTWORK } from "@/lib/guides/artwork";
import { CORNERSTONE_GUIDES } from "@/lib/guides/cornerstones";
import socialImages from "@/lib/seo/social-images.generated.json";
import { socialImageForPage } from "@/lib/seo/social-images";
import { pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/site";

const publicFile = (src: string) => readFileSync(join(process.cwd(), "public", src));
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("guide artwork and social previews", () => {
  it("gives every published guide distinct artwork, including standalone guides", () => {
    const standalone = readdirSync(join(process.cwd(), "app/guides"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
      .map((entry) => entry.name);
    const slugs = [...CORNERSTONE_GUIDES.map((guide) => guide.slug), ...standalone].sort();
    expect(Object.keys(GUIDE_ARTWORK).sort()).toEqual(slugs);
    const art = slugs.map((slug) => GUIDE_ARTWORK[slug]);
    expect(new Set(art.map((image) => image.src)).size).toBe(slugs.length);
    expect(new Set(art.map((image) => hash(publicFile(image.src)))).size).toBe(slugs.length);
    expect(art.every((image) => image.alt.length > 20)).toBe(true);
    expect(art.map((image) => image.src)).not.toContain("/images/clay-guides/guide-library.webp");
    for (const guide of CORNERSTONE_GUIDES) expect(guide.image, guide.slug).toBe(GUIDE_ARTWORK[guide.slug].src);
  });

  it("ships lightweight, decodable social cards at their declared dimensions", async () => {
    const hashes = new Set<string>();
    for (const [route, image] of Object.entries(socialImages)) {
      const bytes = publicFile(image.url);
      const metadata = await sharp(bytes).metadata();
      expect(metadata, route).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
      expect(bytes.length, route).toBeLessThan(500_000);
      hashes.add(hash(bytes));
    }
    expect(hashes.size).toBe(Object.keys(socialImages).length);
    for (const slug of Object.keys(GUIDE_ARTWORK)) expect(socialImages).toHaveProperty(`/guides/${slug}`);
  });

  it("assigns the same public image to Open Graph and Twitter without leaking query or workspace state", () => {
    for (const [path, image] of Object.entries(socialImages)) {
      const metadata = pageMetadata({ title: "Preview", description: "Description", path });
      const expected = [{ ...image, url: absoluteUrl(image.url), type: "image/jpeg" }];
      expect(metadata.openGraph?.images, path).toEqual(expected);
      expect(metadata.twitter?.images, path).toEqual(expected);
    }
    expect(socialImageForPage("/guides/hpp/?product=private#plan")).toEqual(socialImageForPage("/guides/hpp"));
    expect(socialImageForPage("/sourcing/private-workspace?recipe=secret")).toEqual(socialImageForPage("/"));
  });
});
