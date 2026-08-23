/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const sharp = require("sharp");

const repoRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(repoRoot, "design-assets/clay-sources");

const sets = {
  product1: {
    file: "product1-chroma-source.png",
    jobs: [
      [0, 0, 627, 610, "soda.webp"],
      [627, 0, 627, 610, "energy-drink.webp"],
      [0, 630, 627, 624, "sports-hydration.webp"],
      [627, 630, 627, 624, "functional-beverages.webp"],
    ].map((job) => [...job, "products"]),
  },
  product2: {
    file: "product2-chroma-source.png",
    jobs: [
      [0, 0, 627, 610, "cold-pressed-juice.webp"],
      [627, 0, 627, 610, "juice.webp"],
      [0, 630, 627, 624, "rtd-coffee-tea.webp"],
      [627, 630, 627, 624, "water.webp"],
    ].map((job) => [...job, "products"]),
  },
  product3: {
    file: "product3-chroma-source.png",
    jobs: [
      [0, 0, 627, 610, "hot-sauce.webp"],
      [627, 0, 627, 610, "sauce.webp"],
      [0, 630, 627, 624, "salsa.webp"],
      [627, 630, 627, 624, "dressings-marinades.webp"],
    ].map((job) => [...job, "products"]),
  },
  product4: {
    file: "product4-chroma-source.png",
    jobs: [
      [0, 0, 720, 1024, "dips-hummus.webp"],
      [760, 0, 776, 1024, "prepared-refrigerated-foods.webp"],
    ].map((job) => [...job, "products"]),
  },
  support: {
    file: "support-chroma-source.png",
    jobs: [
      [0, 0, 627, 610, "beginner-onboarding.webp"],
      [627, 0, 627, 610, "empty-results.webp"],
      [0, 630, 590, 624, "newsletter.webp"],
      [600, 630, 654, 624, "first-production-run.webp"],
    ].map((job) => [...job, "support"]),
  },
};

async function keyedBuffer(file) {
  const image = sharp(path.join(sourceRoot, file)).ensureAlpha();
  const { width, height } = await image.metadata();
  const data = await image.raw().toBuffer();
  const corner = (x, y) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };
  const corners = [
    corner(0, 0),
    corner(width - 1, 0),
    corner(0, height - 1),
    corner(width - 1, height - 1),
  ];

  for (let y = 0; y < height; y += 1) {
    const fy = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const fx = x / Math.max(1, width - 1);
      const index = (y * width + x) * 4;
      const background = [0, 1, 2].map((channel) => {
        const top = corners[0][channel] * (1 - fx) + corners[1][channel] * fx;
        const bottom = corners[2][channel] * (1 - fx) + corners[3][channel] * fx;
        return top * (1 - fy) + bottom * fy;
      });
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      // The source sheets use a deliberately impossible hot-magenta matte.
      // Key by magenta dominance instead of RGB distance: the generated matte
      // includes lighting and shadows, so distance-to-corner leaves a purple box.
      // Real clay colors in the set (including lavender and coral) do not have
      // this combination of red/blue dominance over green.
      const magentaDominance = Math.min(red, blue) - green;
      const channelGate = Math.max(0, Math.min(1, (Math.min(red, blue) - 64) / 48));
      const matteStrength =
        Math.max(0, Math.min(1, (magentaDominance - 52) / 64)) * channelGate;
      let alpha = 1 - matteStrength;

      if (alpha < 0.04) {
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 0;
        continue;
      }
      if (alpha > 0.96) alpha = 1;
      for (let channel = 0; channel < 3; channel += 1) {
        data[index + channel] = Math.max(
          0,
          Math.min(
            255,
            Math.round((data[index + channel] - (1 - alpha) * background[channel]) / alpha),
          ),
        );
      }
      data[index + 3] = Math.round(alpha * 255);
    }
  }
  return { data, width, height };
}

async function exportAsset(keyed, job) {
  const [left, top, width, height, filename, folder] = job;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = ((top + y) * keyed.width + left + x) * 4;
      if (keyed.data[index + 3] > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("No visible pixels after matte removal");

  const trimmed = await sharp(keyed.data, {
    raw: { width: keyed.width, height: keyed.height, channels: 4 },
  })
    .extract({
      left: left + minX,
      top: top + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .png()
    .toBuffer();

  await sharp(trimmed)
    .resize({
      width: 560,
      height: 560,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true, effort: 4 })
    .toFile(path.join(repoRoot, "public/images/clay-v2", folder, filename));
}

async function main() {
  const requestedSet = process.argv[2];
  if (!sets[requestedSet]) throw new Error(`Unknown clay asset set: ${requestedSet}`);
  const set = sets[requestedSet];
  const keyed = await keyedBuffer(set.file);
  for (const job of set.jobs) {
    try {
      await exportAsset(keyed, job);
    } catch (error) {
      throw new Error(`Failed to export ${job[4]} from ${requestedSet}`, { cause: error });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
