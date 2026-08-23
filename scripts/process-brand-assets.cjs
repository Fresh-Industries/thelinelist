/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const repoRoot = path.resolve(__dirname, "..");
const source = path.join(
  repoRoot,
  "design-assets/brand-sources/line-list-logo-source.png",
);

function transparentBackground() {
  return { r: 0, g: 0, b: 0, alpha: 0 };
}

async function squareIcon(mark, size, paddingRatio = 0.08) {
  const padding = Math.max(1, Math.round(size * paddingRatio));
  return sharp(mark)
    .resize({
      width: size - padding * 2,
      height: size - padding * 2,
      fit: "contain",
      background: transparentBackground(),
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: transparentBackground(),
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

function pngsToIco(entries) {
  const headerSize = 6;
  const directorySize = entries.length * 16;
  let imageOffset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize + directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  entries.forEach(({ size, data }, index) => {
    const offset = headerSize + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, offset);
    header.writeUInt8(size >= 256 ? 0 : size, offset + 1);
    header.writeUInt8(0, offset + 2);
    header.writeUInt8(0, offset + 3);
    header.writeUInt16LE(1, offset + 4);
    header.writeUInt16LE(32, offset + 6);
    header.writeUInt32LE(data.length, offset + 8);
    header.writeUInt32LE(imageOffset, offset + 12);
    imageOffset += data.length;
  });

  return Buffer.concat([header, ...entries.map(({ data }) => data)]);
}

async function main() {
  const fullLogo = await sharp(source)
    .ensureAlpha()
    .trim({ background: transparentBackground(), threshold: 8 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  const markCrop = await sharp(source)
    .ensureAlpha()
    .extract({ left: 0, top: 0, width: 900, height: 940 })
    .png()
    .toBuffer();

  const mark = await sharp(markCrop)
    .trim({ background: transparentBackground(), threshold: 8 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  fs.mkdirSync(path.join(repoRoot, "public/brand"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "public/brand/line-list-logo.png"), fullLogo);
  fs.writeFileSync(path.join(repoRoot, "public/brand/line-list-mark.png"), mark);

  const requestedSizes = [16, 32, 48, 180, 192, 512];
  const icons = new Map();
  for (const size of requestedSizes) {
    icons.set(size, await squareIcon(mark, size, size <= 48 ? 0.04 : 0.08));
  }

  fs.writeFileSync(path.join(repoRoot, "public/favicon-16x16.png"), icons.get(16));
  fs.writeFileSync(path.join(repoRoot, "public/favicon-32x32.png"), icons.get(32));
  fs.writeFileSync(path.join(repoRoot, "public/android-chrome-192x192.png"), icons.get(192));
  fs.writeFileSync(path.join(repoRoot, "public/android-chrome-512x512.png"), icons.get(512));
  fs.writeFileSync(path.join(repoRoot, "app/apple-icon.png"), icons.get(180));
  fs.writeFileSync(path.join(repoRoot, "app/icon1.png"), icons.get(32));
  fs.writeFileSync(path.join(repoRoot, "app/icon2.png"), icons.get(192));
  fs.writeFileSync(
    path.join(repoRoot, "app/favicon.ico"),
    pngsToIco([
      { size: 16, data: icons.get(16) },
      { size: 32, data: icons.get(32) },
      { size: 48, data: icons.get(48) },
    ]),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
