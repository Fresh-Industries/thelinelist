import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const prompts = JSON.parse(await readFile("docs/guide-art-prompts-2026-09-12.json", "utf8"));
const artwork = JSON.parse(await readFile("lib/guides/artwork.json", "utf8"));
await mkdir("public/images/clay-guides", { recursive: true });
let processed = 0;
for (const asset of prompts.assets) {
  const source = path.join("design-assets/guide-sources", `${asset.slug}.png`);
  if (!await access(source).then(() => true, () => false)) continue;
  const target = path.join("public/images/clay-guides", `${asset.slug}.webp`);
  await sharp(source).resize(960, 960, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85, effort: 6 }).toFile(target);
  const { data } = await sharp(source).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (artwork[asset.slug]) artwork[asset.slug].background = `#${[...data].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  processed += 1;
}
for (const art of Object.values(artwork)) art.background ??= "#f4d447";
await writeFile("lib/guides/artwork.json", JSON.stringify(artwork, null, 2) + "\n");
console.log(`Optimized ${processed} guide illustrations to 960px WebP. Source compositions preserved.`);
