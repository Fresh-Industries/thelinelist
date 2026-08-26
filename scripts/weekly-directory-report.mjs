import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(new URL("../data/manufacturer-imports/import-report.generated.json", import.meta.url), "utf8"));
const guideSource = readFileSync(new URL("../lib/guides/practical.ts", import.meta.url), "utf8");
const coreGuideSource = readFileSync(new URL("../lib/guides/cornerstones.ts", import.meta.url), "utf8");
const curatedSource = readFileSync(new URL("../lib/directory/plants.ts", import.meta.url), "utf8");

const practicalGuides = [...guideSource.matchAll(/\n\s+slug: "([^"]+)"/g)].map((match) => match[1]);
const coreGuides = [...coreGuideSource.matchAll(/\n\s+slug: "([^"]+)"/g)].map((match) => match[1]);
const curatedCount = [...curatedSource.matchAll(/\n\s+slug: "[^"]+"/g)].length;
const totalProfiles = curatedCount + report.imported;
const priorityCategories = ["energy-drink", "functional-beverages", "soda", "water", "cold-pressed-juice", "fermented-foods", "prepared-refrigerated-foods", "spices-dry-mixes"];

console.log(`# The Line List weekly directory report\n`);
console.log(`Catalog review date: ${report.generatedAt}`);
console.log(`Public profile records: ${totalProfiles} (${curatedCount} curated + ${report.imported} generated)`);
console.log(`Generated source status: ${report.verified} verified, ${report.listable} public-directory listings`);
console.log(`Deep guides: ${new Set([...coreGuides, ...practicalGuides]).size}`);
console.log(`\n## Priority category coverage`);
for (const category of priorityCategories) console.log(`- ${category}: ${report.categoryCounts[category] ?? 0} generated records`);
console.log(`\n## Review queue`);
console.log(`- Needs review: ${report.skipped.byStatus.NEEDS_REVIEW}`);
console.log(`- Excluded: ${report.skipped.byStatus.EXCLUDE}`);
console.log(`- Safe but not selected: ${report.skipped.safeNotSelected}`);
console.log(`\n## Measurement questions`);
console.log(`- Which product selections reach wizard completion?`);
console.log(`- Which guide visits lead into the directory?`);
console.log(`- Which filters lead to profile views and comparison opens?`);
console.log(`- Which profiles lead to qualified introduction requests?`);
console.log(`- Do clearly labeled featured-slot inquiries grow without changing organic order?`);
