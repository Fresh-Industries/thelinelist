import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { formatExportDate } from "./date-format";
import { FIELD_DEFINITION_BY_KEY } from "./fields";
import { getProductIdentity } from "./product-identity";
import { getSourcingReadiness } from "./readiness";
import { getProductArtwork } from "./store";
import { getCurrentManufacturerResearch } from "./workspace";
import type { PackageDesign, SourcingWorkspace } from "./types";

const PAGE = { width: 612, height: 792, margin: 48 };

export async function createProductPlanPdf(
  workspace: SourcingWorkspace,
  options: { timeZone?: string; exportedAt?: Date } = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const ensure = (height: number) => {
    if (y - height >= PAGE.margin) return;
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  };
  type LineOptions = { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number };
  const lineHeight = (text: string, options: LineOptions = {}) => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    return wrap(text || "Still open", font, size, PAGE.width - PAGE.margin * 2).length * (size + 3) + (options.gap ?? 6);
  };
  const line = (text: string, options: LineOptions = {}, preflight = true) => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const lines = wrap(text || "Still open", font, size, PAGE.width - PAGE.margin * 2);
    if (preflight) ensure(lineHeight(text, options));
    for (const part of lines) {
      page.drawText(part, { x: PAGE.margin, y, size, font, color: options.color ?? rgb(0.09, 0.1, 0.08) });
      y -= size + 3;
    }
    y -= options.gap ?? 6;
  };
  const fieldBlock = (label: string, value: string) => {
    const labelOptions = { size: 8, font: bold, color: rgb(0.35, 0.35, 0.32), gap: 2 };
    const valueOptions = { size: 10, gap: 7 };
    ensure(lineHeight(label, labelOptions) + lineHeight(value, valueOptions));
    line(label, labelOptions, false);
    line(value, valueOptions, false);
  };
  const section = (title: string, keepWithHeight = 0) => {
    const titleOptions = { size: 9, font: bold, color: rgb(0.71, 0.3, 0.17), gap: 8 };
    ensure(26 + lineHeight(title.toUpperCase(), titleOptions) + keepWithHeight);
    y -= 8;
    page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 0.6, color: rgb(0.74, 0.71, 0.67) });
    y -= 18;
    line(title.toUpperCase(), titleOptions, false);
  };

  const identity = getProductIdentity(workspace);
  const readiness = getSourcingReadiness(workspace);
  const storedResearch = workspace.manufacturerResearch;
  const currentResearch = getCurrentManufacturerResearch(workspace);
  const currentMatches = currentResearch?.candidates ?? [];
  const researchStatus = !storedResearch
    ? "Manufacturer research not run"
    : !currentResearch
      ? "Previous manufacturer research is stale"
      : currentResearch.candidateCount > 0
        ? `${currentResearch.candidateCount} current manufacturer possibilit${currentResearch.candidateCount === 1 ? "y" : "ies"}`
        : currentResearch.broadeningApproval
          ? "Founder-approved broader search returned 0 possibilities"
          : "Strict manufacturer search returned 0 possibilities";
  line("THE LINE LIST · FIRST RUN", { size: 9, font: bold, color: rgb(0.71, 0.3, 0.17), gap: 10 });
  line(identity.brandName || identity.productDescriptor, { size: 24, font: bold, gap: 4 });
  if (identity.brandName) line(identity.productDescriptor, { size: 12, color: rgb(0.35, 0.35, 0.32), gap: 10 });
  line(`${readiness.stageLabel} · ${researchStatus} · Exported ${formatExportDate(options.exportedAt ?? new Date(), options.timeZone)}`, { size: 9, color: rgb(0.35, 0.35, 0.32), gap: 4 });
  line(readiness.stageSummary, { size: 9, color: rgb(0.35, 0.35, 0.32), gap: 10 });

  section("Original idea", lineHeight(workspace.originalIdea || "No original idea recorded."));
  line(workspace.originalIdea || "No original idea recorded.");

  const confirmed = Object.values(workspace.fields).filter((field) => field.status === "confirmed" && field.value && field.key !== "internal_notes");
  const firstConfirmedHeight = confirmed[0]
    ? lineHeight(FIELD_DEFINITION_BY_KEY[confirmed[0].key].label, { size: 8, font: bold, gap: 2 }) + lineHeight(confirmed[0].value!, { size: 10, gap: 7 })
    : 0;
  section("Confirmed product brief", firstConfirmedHeight);
  for (const field of confirmed) {
    fieldBlock(FIELD_DEFINITION_BY_KEY[field.key].label, field.value!);
  }

  const review = Object.values(workspace.fields).filter((field) => field.status === "proposed" && field.value);
  if (review.length) {
    section("Agent suggestions awaiting review", lineHeight(`${FIELD_DEFINITION_BY_KEY[review[0].key].label}: ${review[0].value}`));
    for (const field of review) line(`${FIELD_DEFINITION_BY_KEY[field.key].label}: ${field.value}`);
  }

  const openKeys = [...new Set([...readiness.manufacturerMissing, ...readiness.launchMissing])];
  const openText = openKeys.length ? openKeys.map((key) => key === "packaging_format"
    && readiness.packageDesignRequired
    && !readiness.packageDesignReady
    && workspace.fields.packaging_format.status === "confirmed"
    ? "3D packaging direction"
    : FIELD_DEFINITION_BY_KEY[key].label).join(" · ") : "No core planning fields are currently open.";
  section("Still open", lineHeight(openText));
  line(openText);

  if (workspace.packageDesign) {
    ensure(380);
    section("Packaging direction");
    const design = workspace.packageDesign;
    const packagePreview = await loadPackagePreview(pdf, workspace.id, design.previewAssetId);
    ensure(268);
    const panelHeight = 248;
    const panelBottom = y - panelHeight;
    page.drawRectangle({
      x: PAGE.margin,
      y: panelBottom,
      width: PAGE.width - PAGE.margin * 2,
      height: panelHeight,
      color: rgb(0.96, 0.94, 0.9),
      borderColor: rgb(0.78, 0.75, 0.7),
      borderWidth: 0.7,
    });
    if (packagePreview) drawEmbeddedPackagePreview(page, packagePreview, panelBottom, panelHeight);
    else drawFallbackPackagePreview(page, design, panelBottom, panelHeight);
    y = panelBottom - 12;
    line(design.summary, { font: bold });
    line(`Finish: ${design.finish} · Package color: ${design.baseColor} · Label color: ${design.labelColor}`);
    line(`Dimensions: ${design.dimensions.width ?? "open"} × ${design.dimensions.height ?? "open"} × ${design.dimensions.depth ?? "open"}`);
    line("Planning mockup only. Final dimensions, materials, labels, and production compatibility require manufacturer validation.", { size: 8, color: rgb(0.35, 0.35, 0.32) });
  }

  section("Manufacturer research", lineHeight(researchStatus));
  fieldBlock("Research status", researchStatus);
  if (storedResearch) {
    const criteriaMode = storedResearch.broadeningApproval
      ? "Founder-approved broader criteria"
      : storedResearch.request.requiredRequirements.length
        ? "Strict required criteria"
        : "Current research criteria";
    fieldBlock("Criteria mode", criteriaMode);
    fieldBlock("Research run", `${formatExportDate(storedResearch.ranAt, options.timeZone)} · ${storedResearch.candidateCount} result${storedResearch.candidateCount === 1 ? "" : "s"}`);
    if (storedResearch.request.requiredRequirements.length) {
      fieldBlock("Required", storedResearch.request.requiredRequirements.map((key) => FIELD_DEFINITION_BY_KEY[key].label).join(" · "));
    }
    if (storedResearch.request.preferredRequirements.length) {
      fieldBlock("Preferred", storedResearch.request.preferredRequirements.map((key) => FIELD_DEFINITION_BY_KEY[key].label).join(" · "));
    }
    if (!currentResearch && storedResearch.invalidatedAt) fieldBlock("Invalidated", formatExportDate(storedResearch.invalidatedAt, options.timeZone));
  } else {
    line("No manufacturer search has been recorded for this product plan.");
  }

  if (currentMatches.length) {
    const firstMatch = currentMatches[0];
    const firstSources = firstMatch.evidence.filter((item) => item.sourceUrl).map((item) => `${item.sourceLabel || item.sourceUrl} (${item.lastReviewed})`);
    const firstCardHeight = lineHeight(`${firstMatch.manufacturerName} · ${firstMatch.location}`, { font: bold, gap: 3 })
      + lineHeight(firstMatch.fitExplanation, { size: 9, gap: 3 })
      + lineHeight(firstSources.length ? `Sources: ${[...new Set(firstSources)].join(" · ")}` : "No supporting public source was recorded.", { size: 8, gap: 9 });
    section("Current evidence-backed possibilities", firstCardHeight);
    for (const match of currentMatches) {
      const sources = match.evidence.filter((item) => item.sourceUrl).map((item) => `${item.sourceLabel || item.sourceUrl} (${item.lastReviewed})`);
      const sourceText = sources.length ? `Sources: ${[...new Set(sources)].join(" · ")}` : "No supporting public source was recorded.";
      const headingOptions = { font: bold, gap: 3 };
      const explanationOptions = { size: 9, gap: 3 };
      const sourceOptions = { size: 8, color: rgb(0.35, 0.35, 0.32), gap: 9 };
      ensure(lineHeight(`${match.manufacturerName} · ${match.location}`, headingOptions) + lineHeight(match.fitExplanation, explanationOptions) + lineHeight(sourceText, sourceOptions));
      line(`${match.manufacturerName} · ${match.location}`, headingOptions, false);
      line(match.fitExplanation, explanationOptions, false);
      line(sourceText, sourceOptions, false);
    }
  }

  const pages = pdf.getPages();
  pages.forEach((item, index) => item.drawText(`Private founder planning brief · Page ${index + 1} of ${pages.length}`, { x: PAGE.margin, y: 22, size: 7, font: regular, color: rgb(0.45, 0.43, 0.4) }));
  return pdf.save();
}

async function loadPackagePreview(pdf: PDFDocument, workspaceId: string, previewAssetId: string | null): Promise<PDFImage | null> {
  if (!previewAssetId) return null;
  const bytes = await getProductArtwork(workspaceId, previewAssetId);
  if (!bytes) return null;
  try {
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function drawEmbeddedPackagePreview(page: PDFPage, image: PDFImage, panelBottom: number, panelHeight: number) {
  const maxWidth = 390;
  const maxHeight = panelHeight - 20;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: (PAGE.width - width) / 2,
    y: panelBottom + (panelHeight - height) / 2,
    width,
    height,
  });
}

function drawFallbackPackagePreview(page: PDFPage, design: PackageDesign, panelBottom: number, panelHeight: number) {
  const base = pdfColor(design.baseColor, [0.71, 0.3, 0.17]);
  const label = pdfColor(design.labelColor, [0.95, 0.91, 0.84]);
  const centerX = PAGE.width / 2;
  const bottom = panelBottom + 24;
  page.drawEllipse({ x: centerX + 12, y: bottom + 2, xScale: 78, yScale: 12, color: rgb(0.2, 0.18, 0.15), opacity: 0.16 });

  if (design.packagingType === "slim-can") {
    drawCylinder(page, centerX, bottom + 10, 92, 184, base, label, 92);
    page.drawEllipse({ x: centerX, y: bottom + 194, xScale: 46, yScale: 11, color: rgb(0.8, 0.8, 0.77) });
    page.drawEllipse({ x: centerX, y: bottom + 194, xScale: 30, yScale: 6, borderColor: rgb(0.55, 0.55, 0.52), borderWidth: 1 });
  } else if (design.packagingType === "bottle") {
    drawCylinder(page, centerX, bottom + 8, 102, 132, base, label, 66);
    page.drawEllipse({ x: centerX, y: bottom + 140, xScale: 51, yScale: 13, color: base });
    page.drawRectangle({ x: centerX - 24, y: bottom + 140, width: 48, height: 39, color: base });
    page.drawRectangle({ x: centerX - 29, y: bottom + 178, width: 58, height: 24, color: rgb(0.88, 0.84, 0.76), borderColor: rgb(0.55, 0.52, 0.47), borderWidth: 0.8 });
  } else if (design.packagingType === "jar") {
    drawCylinder(page, centerX, bottom + 15, 124, 132, base, label, 65);
    page.drawRectangle({ x: centerX - 67, y: bottom + 143, width: 134, height: 27, color: rgb(0.88, 0.84, 0.76), borderColor: rgb(0.55, 0.52, 0.47), borderWidth: 0.8 });
    page.drawEllipse({ x: centerX, y: bottom + 170, xScale: 67, yScale: 12, color: rgb(0.93, 0.89, 0.82), borderColor: rgb(0.55, 0.52, 0.47), borderWidth: 0.8 });
  } else {
    page.drawRectangle({ x: centerX - 72, y: bottom + 9, width: 144, height: 182, color: base, borderColor: darken(base), borderWidth: 1.2 });
    page.drawEllipse({ x: centerX, y: bottom + 12, xScale: 72, yScale: 13, color: darken(base), opacity: 0.65 });
    page.drawRectangle({ x: centerX - 63, y: bottom + 45, width: 126, height: 96, color: label, opacity: 0.96 });
    page.drawLine({ start: { x: centerX - 66, y: bottom + 174 }, end: { x: centerX + 66, y: bottom + 174 }, thickness: 2, color: darken(base) });
    page.drawRectangle({ x: centerX - 61, y: bottom + 18, width: 13, height: 156, color: rgb(1, 1, 1), opacity: 0.16 });
  }

  page.drawText("Saved 3D package direction", {
    x: PAGE.margin + 14,
    y: panelBottom + panelHeight - 20,
    size: 8,
    color: rgb(0.35, 0.35, 0.32),
  });
}

function drawCylinder(
  page: PDFPage,
  centerX: number,
  bottom: number,
  width: number,
  height: number,
  base: ReturnType<typeof rgb>,
  label: ReturnType<typeof rgb>,
  labelHeight: number,
) {
  const radius = width / 2;
  page.drawRectangle({ x: centerX - radius, y: bottom, width, height, color: base, borderColor: darken(base), borderWidth: 1 });
  page.drawEllipse({ x: centerX, y: bottom, xScale: radius, yScale: 11, color: darken(base), opacity: 0.72 });
  page.drawEllipse({ x: centerX, y: bottom + height, xScale: radius, yScale: 11, color: base, borderColor: darken(base), borderWidth: 0.8 });
  page.drawRectangle({ x: centerX - radius + 8, y: bottom + 8, width: 14, height: height - 16, color: rgb(1, 1, 1), opacity: 0.18 });
  page.drawRectangle({ x: centerX - radius + 7, y: bottom + (height - labelHeight) / 2, width: width - 14, height: labelHeight, color: label, opacity: 0.96 });
}

function pdfColor(value: string, fallback: [number, number, number]): ReturnType<typeof rgb> {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  return match
    ? rgb(Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255)
    : rgb(...fallback);
}

function darken(color: ReturnType<typeof rgb>): ReturnType<typeof rgb> {
  return rgb(color.red * 0.72, color.green * 0.72, color.blue * 0.72);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
