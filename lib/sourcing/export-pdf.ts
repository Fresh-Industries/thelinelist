import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { FIELD_DEFINITION_BY_KEY } from "./fields";
import { getProductIdentity } from "./product-identity";
import { getSourcingReadiness } from "./readiness";
import type { SourcingWorkspace } from "./types";

const PAGE = { width: 612, height: 792, margin: 48 };

export async function createProductPlanPdf(workspace: SourcingWorkspace): Promise<Uint8Array> {
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
  const line = (text: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const lines = wrap(text || "Still open", font, size, PAGE.width - PAGE.margin * 2);
    ensure(lines.length * (size + 3) + (options.gap ?? 6));
    for (const part of lines) {
      page.drawText(part, { x: PAGE.margin, y, size, font, color: options.color ?? rgb(0.09, 0.1, 0.08) });
      y -= size + 3;
    }
    y -= options.gap ?? 6;
  };
  const section = (title: string) => {
    ensure(30);
    y -= 8;
    page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 0.6, color: rgb(0.74, 0.71, 0.67) });
    y -= 18;
    line(title.toUpperCase(), { size: 9, font: bold, color: rgb(0.71, 0.3, 0.17), gap: 8 });
  };

  const identity = getProductIdentity(workspace);
  const readiness = getSourcingReadiness(workspace);
  line("THE LINE LIST · FIRST RUN", { size: 9, font: bold, color: rgb(0.71, 0.3, 0.17), gap: 10 });
  line(identity.brandName || identity.productDescriptor, { size: 24, font: bold, gap: 4 });
  if (identity.brandName) line(identity.productDescriptor, { size: 12, color: rgb(0.35, 0.35, 0.32), gap: 10 });
  line(`${readiness.stageLabel} · Exported ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { size: 9, color: rgb(0.35, 0.35, 0.32), gap: 4 });
  line(readiness.stageSummary, { size: 9, color: rgb(0.35, 0.35, 0.32), gap: 10 });

  section("Original idea");
  line(workspace.originalIdea || "No original idea recorded.");

  section("Confirmed product brief");
  const confirmed = Object.values(workspace.fields).filter((field) => field.status === "confirmed" && field.value && field.key !== "internal_notes");
  for (const field of confirmed) {
    line(FIELD_DEFINITION_BY_KEY[field.key].label, { size: 8, font: bold, color: rgb(0.35, 0.35, 0.32), gap: 2 });
    line(field.value!, { size: 10, gap: 7 });
  }

  const review = Object.values(workspace.fields).filter((field) => field.status === "proposed" && field.value);
  if (review.length) {
    section("Agent suggestions awaiting review");
    for (const field of review) line(`${FIELD_DEFINITION_BY_KEY[field.key].label}: ${field.value}`);
  }

  section("Still open");
  const openKeys = [...new Set([...readiness.manufacturerMissing, ...readiness.launchMissing])];
  line(openKeys.length ? openKeys.map((key) => FIELD_DEFINITION_BY_KEY[key].label).join(" · ") : "No core planning fields are currently open.");

  if (workspace.packageDesign) {
    section("Packaging direction");
    const design = workspace.packageDesign;
    line(design.summary, { font: bold });
    line(`Finish: ${design.finish} · Package color: ${design.baseColor} · Label color: ${design.labelColor}`);
    line(`Dimensions: ${design.dimensions.width ?? "open"} × ${design.dimensions.height ?? "open"} × ${design.dimensions.depth ?? "open"}`);
    line("Planning mockup only. Final dimensions, materials, labels, and production compatibility require manufacturer validation.", { size: 8, color: rgb(0.35, 0.35, 0.32) });
  }

  if (workspace.matches.length) {
    section("Evidence-backed manufacturer possibilities");
    for (const match of workspace.matches) {
      line(`${match.manufacturerName} · ${match.location}`, { font: bold, gap: 3 });
      line(match.fitExplanation, { size: 9, gap: 3 });
      const sources = match.evidence.filter((item) => item.sourceUrl).map((item) => `${item.sourceLabel || item.sourceUrl} (${item.lastReviewed})`);
      line(sources.length ? `Sources: ${[...new Set(sources)].join(" · ")}` : "No supporting public source was recorded.", { size: 8, color: rgb(0.35, 0.35, 0.32), gap: 9 });
    }
  }

  const pages = pdf.getPages();
  pages.forEach((item, index) => item.drawText(`Private founder planning brief · Page ${index + 1} of ${pages.length}`, { x: PAGE.margin, y: 22, size: 7, font: regular, color: rgb(0.45, 0.43, 0.4) }));
  return pdf.save();
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
