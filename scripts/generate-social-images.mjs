import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { PRODUCT_CATEGORIES } from "../lib/directory/categories.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guides = JSON.parse(await readFile(path.join(root, "lib/guides/artwork.json"), "utf8"));
const pages = JSON.parse(await readFile(path.join(root, "lib/seo/social-pages.json"), "utf8"));
const output = path.join(root, "public/images/og");
const categoryGuide = { bakery: "bakery-manufacturing", "spices-dry-mixes": "dry-blending", "frozen-foods": "frozen-food-cold-chain", "shelf-stable-meals": "retort", "soups-broths-entrees": "sauce", "fermented-foods": "fermented-food-manufacturing" };

for (const [slug, guide] of Object.entries(guides)) {
  pages[`/guides/${slug}`] = { title: guide.title, eyebrow: slug === "first-run-costs" ? "First-run cost worksheet" : "The food founder guides", image: guide.src };
}
for (const category of PRODUCT_CATEGORIES) {
  const image = `/images/clay-v2/products/${category.slug}.webp`;
  const hasProductImage = await access(path.join(root, "public", image)).then(() => true, () => false);
  pages[`/find-manufacturers/${category.slug}`] = {
    title: `${category.label} manufacturers`,
    eyebrow: "Explore sourced public listings",
    image: hasProductImage ? image : categoryGuide[category.slug] ? guides[categoryGuide[category.slug]].src : null,
  };
}

const manifest = Object.fromEntries(Object.entries(pages).map(([route, page]) => [route, {
  url: `/images/og/${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}.jpg`,
  width: 1200, height: 630, alt: `${page.title} — The Line List`,
}]));

await mkdir(output, { recursive: true });
await writeFile(path.join(root, "lib/seo/social-images.generated.json"), JSON.stringify(manifest, null, 2) + "\n");
if (process.argv.includes("--catalog-only")) {
  console.log(`Catalogued ${Object.keys(manifest).length} public social previews.`);
  process.exit(0);
}

const encode = async (file, mime) => `data:${mime};base64,${(await readFile(path.join(root, file))).toString("base64")}`;
const displayFont = await encode("design-assets/social-fonts/BricolageGrotesque[opsz,wdth,wght].ttf", "font/ttf");
const bodyFont = await encode("design-assets/social-fonts/Manrope[wght].ttf", "font/ttf");
const logo = await encode("public/brand/line-list-logo.png", "image/png");
const mark = await encode("public/brand/line-list-mark.png", "image/png");
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const browser = await chromium.launch({ channel: process.env.SOCIAL_BROWSER_CHANNEL || "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let count = 0;
try {
  for (const [route, item] of Object.entries(pages)) {
    const art = item.image ? await encode(path.join("public", item.image), item.image.endsWith(".png") ? "image/png" : "image/webp") : mark;
    const illustratedCover = Boolean(item.image?.startsWith("/images/clay-guides/"));
    const visualBackground = illustratedCover
      ? `#${(await sharp(path.join(root, "public", item.image)).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer()).toString("hex")}`
      : "#f4d447";
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
      @font-face{font-family:Bricolage;src:url('${displayFont}') format('truetype');font-weight:400 800}
      @font-face{font-family:Manrope;src:url('${bodyFont}') format('truetype');font-weight:400 800}
      *{box-sizing:border-box}body{margin:0;color:#16382d;background:#f6efe3;font-family:Manrope,sans-serif}
      .frame{width:1200px;height:630px;border:12px solid #16382d;position:relative;overflow:hidden;display:grid;grid-template-columns:57% 43%}
      .copy{padding:36px 34px 90px 40px;display:flex;flex-direction:column;z-index:1;position:relative;min-height:0}
      .logo{width:162px;height:80px;object-fit:contain;object-position:left center;margin-bottom:34px}
      .eyebrow{font-size:17px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;margin:0 0 15px}
      h1{font-family:Bricolage,sans-serif;font-variation-settings:'opsz' 48,'wdth' 100,'wght' 800;font-size:63px;line-height:1.03;letter-spacing:-1.9px;margin:0;max-width:575px;overflow-wrap:normal}
      .url{position:absolute;left:40px;bottom:34px;font-size:19px;font-weight:700;letter-spacing:.2px}
      .visual{display:flex;align-items:center;justify-content:center;background:${visualBackground};border-left:3px solid #16382d;position:relative;overflow:hidden}
      .visual img{width:${illustratedCover ? "100%" : "92%"};height:${illustratedCover ? "100%" : "84%"};object-fit:contain}
      .corner{position:absolute;right:24px;bottom:24px;font-size:15px;font-weight:700;background:#f6efe3;border:2px solid #16382d;padding:9px 13px;box-shadow:3px 3px 0 #16382d}
    </style></head><body><main class="frame"><section class="copy"><img class="logo" src="${logo}" alt="The Line List"><p class="eyebrow">${escape(item.eyebrow)}</p><h1>${escape(item.title)}</h1><div class="url">thelinelist.com</div></section><div class="visual"><img src="${art}" alt=""><div class="corner">${route.startsWith("/guides/") ? "Learn your next step" : "From idea to first run"}</div></div></main></body></html>`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
    const geometry = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      const footer = document.querySelector(".url");
      while (heading.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 20 && parseFloat(getComputedStyle(heading).fontSize) > 43) heading.style.fontSize = `${parseFloat(getComputedStyle(heading).fontSize) - 1}px`;
      return { headingBottom: heading.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top, footerBottom: footer.getBoundingClientRect().bottom, width: document.documentElement.scrollWidth };
    });
    if (geometry.headingBottom > geometry.footerTop - 10 || geometry.footerBottom > 606 || geometry.width > 1200) throw new Error(`Social text overflows: ${route}`);
    await page.screenshot({ path: path.join(root, "public", manifest[route].url), type: "jpeg", quality: 91 });
    count += 1;
  }
} finally { await browser.close(); }
console.log(`Rendered ${count} distinct 1200 × 630 social previews with the approved fonts and logo.`);
