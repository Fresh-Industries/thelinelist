import { Buffer } from "node:buffer";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlantBySlug } from "@/lib/directory";
import { createProductPlanPdf } from "@/lib/sourcing/export-pdf";
import { matchManufacturerRecords } from "@/lib/sourcing/matching";
import { applyFounderFieldUpdate, applyManufacturerResearch, createWorkspace, invalidateManufacturerResearch } from "@/lib/sourcing/workspace";
import type { ManufacturerResearchBroadeningApproval, ManufacturerResearchRequest, SourcingFieldKey } from "@/lib/sourcing/types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sourcing/store", () => ({ getProductArtwork: vi.fn(async () => null) }));

describe("sourcing PDF research truth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("labels never-run, strict-zero, broadened-zero, current-result, and stale research distinctly", async () => {
    const workspace = completeWorkspace();
    expect(await pdfText(workspace)).toContain("Manufacturer research not run");

    const strictRequest: ManufacturerResearchRequest = {
      geographyPreference: null,
      resultLimit: 3,
      requiredRequirements: ["certifications"],
      preferredRequirements: ["packaging_format"],
    };
    const strictZero = applyManufacturerResearch(workspace, strictRequest, []);
    const strictText = await pdfText(strictZero);
    expect(strictText).toContain("Strict manufacturer search returned 0 possibilities");
    expect(strictText).toContain("Strict required criteria");
    expect(strictText).toContain("Certification needs");

    const broadenedRequest: ManufacturerResearchRequest = {
      ...strictRequest,
      requiredRequirements: [],
      preferredRequirements: ["packaging_format", "certifications"],
    };
    const approval: ManufacturerResearchBroadeningApproval = {
      originalRequest: strictRequest,
      broadenedRequest,
      approvedBy: "founder",
      approvedAt: "2026-09-02T02:00:00.000Z",
      workspaceRevision: strictZero.revision,
      mutationId: "founder-broadening-pdf-state-001",
    };
    const broadenedZero = applyManufacturerResearch(strictZero, broadenedRequest, [], approval);
    const broadenedText = await pdfText(broadenedZero);
    expect(broadenedText).toContain("Founder-approved broader search returned 0 possibilities");
    expect(broadenedText).toContain("Founder-approved broader criteria");

    const candidates = matchManufacturerRecords(workspace, [getPlantBySlug("create-a-pack-foods-inc")!], { resultLimit: 1 });
    expect(candidates).toHaveLength(1);
    const withResults = applyManufacturerResearch(workspace, { ...strictRequest, requiredRequirements: [], preferredRequirements: [] }, candidates);
    expect(await pdfText(withResults)).toContain("1 current manufacturer possibility");

    const stale = invalidateManufacturerResearch(withResults);
    const staleText = await pdfText(stale);
    expect(staleText).toContain("Previous manufacturer research is stale");
    expect(staleText).toContain("Invalidated");
  });
});

function completeWorkspace() {
  let workspace = createWorkspace({ idea: "Shelf-stable barbecue sauce in an 8 oz glass bottle. First run 50,000 bottles." });
  const updates: Array<[SourcingFieldKey, string]> = [
    ["product_type", "Barbecue sauce"],
    ["product_format", "8 oz bottle"],
    ["product_description", "Shelf-stable barbecue sauce"],
    ["formula_status", "Untested home prototype"],
    ["packaging_format", "Glass bottle"],
    ["packaging_size", "8 oz"],
    ["production_volume", "50,000 bottles"],
    ["storage_distribution", "Shelf-stable"],
  ];
  for (const [key, value] of updates) workspace = applyFounderFieldUpdate(workspace, { key, value, status: "confirmed", shareWithManufacturer: true });
  return workspace;
}

async function pdfText(workspace: ReturnType<typeof completeWorkspace>) {
  const bytes = await createProductPlanPdf(workspace, { timeZone: "America/Chicago", exportedAt: new Date("2026-09-02T02:00:00.000Z") });
  const document = await PDFDocument.load(bytes);
  return document.getPages().flatMap((page) => {
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    return refs.flatMap((ref) => {
      const stream = document.context.lookup(ref) as PDFRawStream;
      const operators = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      return [...operators.matchAll(/<([0-9A-F]+)>\s*Tj/gi)].map((match) => Buffer.from(match[1], "hex").toString("latin1"));
    });
  }).join("\n");
}
