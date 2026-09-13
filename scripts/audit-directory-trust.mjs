/** Read-only comparison of the checked-out repair against the inspected baseline.
 * Writes a local review artifact only; never contacts a service or database.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import assert from "node:assert/strict";
import { parseCsv } from "./import-manufacturers.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const baseline = process.argv.find((value) => value.startsWith("--baseline="))?.slice(11) ?? "dde5d4d";
assert.match(baseline, /^[a-f\d]{7,40}$/i, "Baseline must be a commit SHA.");
const fromGit = (file) => execFileSync("git", ["show", `${baseline}:${file}`], { cwd: root, encoding: "utf8", maxBuffer: 10_000_000 });
const parseCatalog = (source) => JSON.parse(source.match(/export const IMPORTED_PLANTS = ([\s\S]+) satisfies Plant\[\];/)[1]);
const before = parseCatalog(fromGit("lib/directory/imported-plants.generated.ts"));
const after = parseCatalog(readFileSync(join(root, "lib/directory/imported-plants.generated.ts"), "utf8"));
const oldReport = JSON.parse(fromGit("data/manufacturer-imports/import-report.generated.json"));
const report = JSON.parse(readFileSync(join(root, "data/manufacturer-imports/import-report.generated.json"), "utf8"));
const reviews = JSON.parse(readFileSync(join(root, "data/manufacturer-imports/trust-reviews-2026-09-13.json"), "utf8"));
const newBySlug = new Map(after.map((plant) => [plant.slug, plant]));
const oldBySlug = new Map(before.map((plant) => [plant.slug, plant]));
const recordsBySlug = new Map(report.catalogRecords.map((record) => [record.slug, record]));
const sourceRows = new Map(report.sourceFiles.flatMap((file) => parseCsv(readFileSync(join(root, "data/manufacturer-imports", file), "utf8")).map((row, index) => [`${file}:${index + 2}`, row])));
const audited = before.filter((plant) => plant.smallRunSignal);
assert.equal(audited.length, oldReport.smallRunSignals);
const meaningfulFields = ["smallRunSignal", "publishedSmallMoq", "categories", "processes", "finderProcesses", "moqDisplay", "publicEmail", "phone"];
const changes = after.flatMap((plant) => {
  const previous = oldBySlug.get(plant.slug);
  return meaningfulFields.flatMap((field) => JSON.stringify(previous?.[field]) === JSON.stringify(plant[field]) ? [] : [{
    slug: plant.slug, source: recordsBySlug.get(plant.slug)?.source,
    field, before: previous?.[field] ?? null, proposed: plant[field] ?? null,
  }]);
});
function concerns(plant) {
  const minimum = plant.moqDisplay ?? "";
  return [
    !minimum || /unknown|not published|unpublished|dependent|not stated/i.test(minimum) ? "Minimum unknown or qualified; never confirmed fit." : null,
    /pilot|trial|test/i.test(minimum) ? "Pilot terms must not be used as a commercial production MOQ." : null,
    /private[- ]label|wholesale|custom label|unlabeled/i.test(minimum) ? "Offer-specific terms; custom-recipe minimum remains separate." : null,
    /per (?:SKU|flavor|product)/i.test(minimum) ? "Requires a compatible quantity for each SKU, flavor or product." : null,
    /\$/.test(minimum) ? "Currency is not a quantity unit." : null,
    /quarter|annual|per year|capacity|storage|warehouse|standard batch/i.test(minimum) ? "Capacity, equipment, storage or recurring commitment is not a first-run MOQ." : null,
    /also cites|contact form states|10000-20000|10,000-20,000/i.test(minimum) ? "Different public values or qualifiers require supplier clarification." : null,
    !reviews[plant.slug] ? "Contact not rechecked on official sources in this session; preserve prior source/date." : null,
    plant.claimSource !== "company-published" ? "Public directory or mixed-source claims are not supplier confirmation." : null,
  ].filter(Boolean);
}
const signalAudit = audited.map((plant) => {
  const proposed = newBySlug.get(plant.slug);
  const negated = /(?:not|more than)[^.;]{0,65}first[- ]run/i.test(plant.manufacturingCapabilitiesPublished ?? "");
  return {
    slug: plant.slug, name: plant.name, source: recordsBySlug.get(plant.slug)?.source,
    sourceUrls: [...new Set([plant.website.href, ...plant.extraLinks?.map((link) => link.href) ?? []])],
    lastSourceReview: plant.lastVerified, claimSource: plant.claimSource,
    supplierConfirmed: false,
    beforeSignal: plant.smallRunSignal,
    proposedSignal: proposed?.smallRunSignal ?? null,
    disposition: proposed?.smallRunSignal ? "Scoped public option; quantity and project fit still need confirmation."
      : negated ? "Remove false positive extracted from a negated/comparative first-run statement."
        : !plant.moqDisplay ? "Remove flag-only or unsupported production signal."
          : "Remove: a minimum, estimate, nonproduction offer or unknown value alone is not a small-run option.",
    importSourceRecord: sourceRows.get(recordsBySlug.get(plant.slug)?.source),
    minimumAsPublished: plant.moqDisplay,
    capabilitiesAsRecorded: plant.manufacturingCapabilitiesPublished,
    questions: concerns(plant),
    contactReview: reviews[plant.slug]?.contact ?? null,
  };
});
const payload = {
  mode: "dry-run-review", reviewedAt: "2026-09-13", baseline,
  productionWrites: false, deployed: false,
  coverage: "All 98 prior signals checked against stored source claims and extraction rules; priority official-source reviews are separately listed. This is not a live re-verification of every supplier.",
  counts: {
    sourceFiles: report.sourceFiles.length, sourceRows: report.sourceRows, imported: after.length,
    total: report.finalCatalogCount, originalSignals: audited.length,
    removedOriginalSignals: signalAudit.filter((row) => !row.proposedSignal).length,
    retainedOriginalOptions: signalAudit.filter((row) => row.proposedSignal).length,
    newExplicitOptions: after.filter((plant) => plant.smallRunSignal && !oldBySlug.get(plant.slug)?.smallRunSignal).length,
    proposedImportedOptions: after.filter((plant) => plant.smallRunSignal).length,
    negatedFirstRunSignals: signalAudit.filter((row) => row.disposition.includes("negated/comparative")).length,
    duplicateRowsAlreadyExcluded: report.duplicates, invalidRowsAlreadyExcluded: report.invalid,
  },
  sourceFiles: report.sourceFiles,
  signalAudit,
  proposedGeneratedFieldChanges: changes,
  priorityPublicSourceReviews: reviews,
  excludedDuplicates: report.duplicateRecords,
  invalidRows: report.invalidRecords,
  unresolved: [
    "No discovery replies or supplier confirmations were ingested; public sources remain distinct from supplier confirmation.",
    "Different offer/unit/SKU minimums remain qualified raw text; conservative comparison returns unknown when terms cannot be aligned.",
    "Assemblies Unlimited and Earth Ranch publish different qualified minimums; ask which applies. Absolutely World Class publishes both a 150-gallon floor and an approximate 1,100-bottle yield for 16 oz containers; do not replace either with inferred arithmetic.",
    "HNO contact retrieval failed; Heritage contact page was unavailable; Lupo bottling-specific email and phone were not reconfirmed by its retail site; Croix Valley lists two phones.",
    "31 source duplicates and two invalid Batch 23 rows remain excluded; no new entities were merged or deleted.",
    "No production database or deployed application data was accessed. Review and release this branch separately.",
  ],
};
const output = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
if (output) writeFileSync(join(root, output), `${JSON.stringify(payload, null, 2)}\n`);
else process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
console.error(JSON.stringify(payload.counts));
