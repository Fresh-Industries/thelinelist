import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INPUT_DIRECTORY = join(ROOT, "data/manufacturer-imports");
const CURATED_CATALOG = join(ROOT, "lib/directory/plants.ts");
const GENERATED_CATALOG = join(ROOT, "lib/directory/imported-plants.generated.ts");
const GENERATED_REPORT = join(ROOT, "data/manufacturer-imports/import-report.generated.json");
const SAFE_STATUSES = new Set(["VERIFIED", "LISTABLE"]);
const TARGET_COUNT = 50;
const TARGET_LISTABLE_COUNT = 2;

const rowSchema = z.object({
  company_name: z.string().trim().min(1),
  city: z.string().trim(),
  state: z.string().trim().length(2),
  website: z.string().trim(),
  phone: z.string().trim(),
  public_email: z.string().trim(),
  product_types: z.string().trim(),
  manufacturing_capabilities: z.string().trim(),
  packaging_formats: z.string().trim(),
  moq: z.string().trim(),
  certifications: z.string().trim(),
  operation_type: z.string().trim(),
  source_urls: z.string().trim(),
  last_checked_date: z.string().trim().min(10),
  status: z.enum(["VERIFIED", "LISTABLE", "NEEDS_REVIEW", "EXCLUDE"]),
  confidence: z.coerce.number().int().min(1).max(5),
  flags: z.string().trim(),
  quality_notes: z.string().trim(),
  master_name: z.string().trim(),
  master_dedupe_key: z.string().trim().min(1),
});

const categoryRules = [
  ["soda", /\b(soda|soft drinks?|sparkling beverages?|carbonated beverages?)\b/i],
  ["energy-drink", /\benergy (drinks?|beverages?)\b/i],
  ["sports-hydration", /\b(sports? drinks?|hydration drinks?|electrolyte drinks?)\b/i],
  ["functional-beverages", /\b(functional beverages?|wellness drinks?|wellness shots?)\b/i],
  ["cold-pressed-juice", /\bcold[- ]pressed juices?\b/i],
  ["juice", /\b(juices?|lemonades?|smoothies?|juice shots?)\b/i],
  ["rtd-coffee-tea", /\b(RTD|ready[- ]to[- ]drink|cold[- ]brew)\b.*\b(coffee|tea)\b|\b(coffee|tea)\b.*\b(RTD|ready[- ]to[- ]drink|beverages?)\b/i],
  ["water", /\b(bottled|packaged|sparkling|still) waters?\b/i],
  ["hot-sauce", /\bhot sauces?\b/i],
  ["sauce", /\b(sauces?|condiments?|BBQ|barbecue|mustards?|ketchup|syrups?)\b/i],
  ["salsa", /\bsalsas?\b/i],
  ["dressings-marinades", /\b(dressings?|marinades?|vinaigrettes?)\b/i],
  ["dips-hummus", /\b(dips?|hummus)\b/i],
  ["prepared-refrigerated-foods", /\b(prepared foods?|refrigerated foods?|prepared meals?|refrigerated meals?|soups?|salads?|prepared sides?|grav(?:y|ies)|baby food)\b/i],
];

const processRules = [
  ["hpp", /\b(HPP|high[- ]pressure processing)\b/i],
  ["hot-fill", /\b(hot[- ]fill|hot fill|hot pack)\b/i],
  ["retort", /\bretort\b/i],
  ["cold-fill", /\b(cold[- ]fill|cold fill)\b/i],
  ["kettle", /\b(open[- ]kettle|kettle cooking|kettle[- ]cooked)\b/i],
  ["pack-out", /\bpack[- ]out\b/i],
  ["acidified", /\bacidified\b/i],
  ["htst", /\bHTST\b/i],
  ["aseptic", /\baseptic\b/i],
];

const finderProductByCategory = {
  soda: "beverage",
  "energy-drink": "beverage",
  "sports-hydration": "beverage",
  "functional-beverages": "beverage",
  "cold-pressed-juice": "beverage",
  juice: "beverage",
  "rtd-coffee-tea": "beverage",
  water: "beverage",
  "hot-sauce": "sauce",
  sauce: "sauce",
  salsa: "sauce",
  "dressings-marinades": "sauce",
  "dips-hummus": "prepared-rte",
  "prepared-refrigerated-foods": "prepared-rte",
};

function parseCsv(value) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows[0]?.map((header) => header.replace(/^\uFEFF/, "")) ?? [];
  return rows.slice(1).filter((values) => values.some(Boolean)).map((values) => (
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  ));
}

function splitList(value) {
  return value.split(";").map((item) => item.trim()).filter(Boolean);
}

function normalizeWords(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedDomain(value) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizedPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function normalizedEmail(value) {
  return value.trim().toLowerCase();
}

function slugify(value) {
  return normalizeWords(value).replace(/\s+/g, "-");
}

function sourceLabel(url, index) {
  const domain = normalizedDomain(url);
  if (domain) return domain;
  return `Public source ${index + 1}`;
}

function mapCategories(row) {
  const disclosedProducts = splitList(row.product_types);
  return categoryRules
    .filter(([category, pattern]) => disclosedProducts.some((product) => {
      if (category === "prepared-refrigerated-foods" && /\b(dry|powder(?:ed)?)\b/i.test(product)) return false;
      return pattern.test(product);
    }))
    .map(([category]) => category);
}

function mapProcesses(row) {
  const disclosedCapabilities = row.manufacturing_capabilities;
  return processRules
    .filter(([, pattern]) => pattern.test(disclosedCapabilities))
    .map(([process]) => process);
}

function validateTaxonomyMappings() {
  const categoriesFor = (product_types) => mapCategories({ product_types });
  assert.deepEqual(categoriesFor("BBQ sauces"), ["sauce"]);
  assert.deepEqual(categoriesFor("marinades"), ["dressings-marinades"]);
  assert.deepEqual(categoriesFor("RTD coffee"), ["rtd-coffee-tea"]);
  assert.deepEqual(categoriesFor("energy beverages"), ["energy-drink"]);
  assert.deepEqual(categoriesFor("cold pressed juice"), ["cold-pressed-juice", "juice"]);
  assert.deepEqual(categoriesFor("tea pods"), []);
  assert.deepEqual(categoriesFor("bakery products"), []);
  assert.deepEqual(categoriesFor("dry mixes (cake/brownie/soup); powdered drink mixes"), []);

  const processesFor = (manufacturing_capabilities) => mapProcesses({ manufacturing_capabilities });
  assert.deepEqual(processesFor("Acidified; hot fill; HPP; retort; cold fill"), ["hpp", "hot-fill", "retort", "cold-fill", "acidified"]);
  assert.deepEqual(processesFor("Ambient filling"), []);
}

function normalizeOperationType(value) {
  const normalized = normalizeWords(value);
  if (/shared kitchen|incubator/.test(normalized)) return "shared-kitchen-incubator";
  if (/brand with co pack/.test(normalized)) return "brand-with-co-pack";
  if (/private label producer/.test(normalized)) return "private-label-producer";
  if (/co manufacturer/.test(normalized)) return "co-manufacturer";
  if (/contract manufacturer/.test(normalized)) return "contract-manufacturer";
  if (/co packer/.test(normalized)) return "co-packer";
  return "other";
}

function dataQualityScore(row) {
  const websiteDomain = normalizedDomain(row.website);
  const emailDomain = normalizedEmail(row.public_email).split("@")[1] ?? "";
  return Number(Boolean(row.website)) * 20
    + Number(Boolean(row.product_types)) * 15
    + Number(Boolean(row.manufacturing_capabilities)) * 15
    + Number(Boolean(row.packaging_formats)) * 8
    + Number(Boolean(row.moq)) * 12
    + Number(/\d/.test(row.moq)) * 10
    + Number(Boolean(row.certifications)) * 8
    + Number(Boolean(websiteDomain) && websiteDomain === emailDomain) * 15
    + splitList(row.source_urls).length * 3
    + Math.min(row.quality_notes.length, 500) / 100;
}

function cohortScore(row) {
  const flags = row.flags.toLowerCase();
  return (row.status === "VERIFIED" ? 1_000 : 0)
    + row.confidence * 100
    + (/startup_friendly|first_run/.test(flags) ? 80 : 0)
    + (/small_batch|pilot|low_moq|flexible_minimum|moq_published|published_moq/.test(flags) ? 45 : 0)
    + dataQualityScore(row);
}

function chooseRicherRow(left, right) {
  const leftScore = dataQualityScore(left);
  const rightScore = dataQualityScore(right);
  if (rightScore !== leftScore) return rightScore > leftScore ? right : left;
  if (right.status !== left.status) return right.status === "VERIFIED" ? right : left;
  return right.__source.localeCompare(left.__source) < 0 ? right : left;
}

function loadRows() {
  const files = readdirSync(INPUT_DIRECTORY).filter((file) => file.endsWith(".csv")).sort();
  return files.flatMap((file) => {
    const parsed = parseCsv(readFileSync(join(INPUT_DIRECTORY, file), "utf8"));
    return parsed.map((row, rowIndex) => ({
      ...rowSchema.parse(row),
      __source: `${file}:${rowIndex + 2}`,
    }));
  });
}

function loadCuratedIdentities() {
  const source = readFileSync(CURATED_CATALOG, "utf8");
  const starts = [...source.matchAll(/\n  \{\n    slug: /g)].map((match) => match.index ?? 0);
  return starts.map((start, index) => {
    const block = source.slice(start, starts[index + 1] ?? source.length);
    const name = block.match(/\n    name: "([^"]+)"/)?.[1] ?? "";
    const slug = block.match(/\n    slug: "([^"]+)"/)?.[1] ?? "";
    const city = block.match(/\{ city: "([^"]+)", state: "([A-Z]{2})"/)?.[1] ?? "";
    const state = block.match(/\{ city: (?:"[^"]+"|null), state: "([A-Z]{2})"/)?.[1] ?? "";
    const website = block.match(/website: \{[^\n]*href: "([^"]+)"/)?.[1] ?? "";
    return { name, slug, city, state, domain: normalizedDomain(website) };
  }).filter((identity) => identity.slug);
}

function sameCompanyName(left, right) {
  const leftName = normalizeWords(left);
  const rightName = normalizeWords(right);
  if (leftName === rightName) return true;
  const leftTokens = new Set(leftName.split(" ").filter((token) => token.length > 2 && !["company", "foods", "food", "llc", "inc"].includes(token)));
  const rightTokens = new Set(rightName.split(" ").filter((token) => token.length > 2 && !["company", "foods", "food", "llc", "inc"].includes(token)));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap >= 2 && overlap / Math.min(leftTokens.size || 1, rightTokens.size || 1) >= 0.66;
}

function existingMatch(row, curatedIdentities) {
  const domain = normalizedDomain(row.website);
  return curatedIdentities.find((identity) => (
    (domain && identity.domain === domain)
    || (sameCompanyName(row.company_name, identity.name)
      && row.city.toLowerCase() === identity.city.toLowerCase()
      && row.state === identity.state)
  ));
}

function consolidateSafeRows(rows) {
  const byMasterKey = new Map();
  const repeatedMasterKeys = [];
  for (const row of rows.filter((candidate) => SAFE_STATUSES.has(candidate.status))) {
    const previous = byMasterKey.get(row.master_dedupe_key);
    if (previous) repeatedMasterKeys.push({ companyName: row.company_name, source: row.__source, identity: row.master_dedupe_key });
    byMasterKey.set(row.master_dedupe_key, previous ? chooseRicherRow(previous, row) : row);
  }

  const consolidated = [];
  const crossIdentityDuplicates = [];
  for (const row of [...byMasterKey.values()].sort((left, right) => left.company_name.localeCompare(right.company_name))) {
    const domain = normalizedDomain(row.website);
    const phone = normalizedPhone(row.phone);
    const email = normalizedEmail(row.public_email);
    const duplicateIndex = consolidated.findIndex((candidate) => (
      (domain && domain === normalizedDomain(candidate.website))
      || (phone && email && phone === normalizedPhone(candidate.phone) && email === normalizedEmail(candidate.public_email))
      || (sameCompanyName(row.company_name, candidate.company_name)
        && row.city.toLowerCase() === candidate.city.toLowerCase()
        && row.state === candidate.state)
    ));

    if (duplicateIndex === -1) {
      consolidated.push(row);
      continue;
    }

    const previous = consolidated[duplicateIndex];
    const kept = chooseRicherRow(previous, row);
    const skipped = kept === previous ? row : previous;
    consolidated[duplicateIndex] = kept;
    crossIdentityDuplicates.push({ companyName: skipped.company_name, source: skipped.__source, kept: kept.company_name, reason: "secondary identity match" });
  }

  return { consolidated, repeatedMasterKeys, crossIdentityDuplicates };
}

function toPlant(row, usedSlugs) {
  let slug = slugify(row.company_name);
  if (usedSlugs.has(slug)) slug = `${slug}-${row.city ? slugify(row.city) : row.state.toLowerCase()}`;
  if (usedSlugs.has(slug)) slug = `${slug}-${createHash("sha1").update(row.master_dedupe_key).digest("hex").slice(0, 6)}`;
  usedSlugs.add(slug);

  const categories = mapCategories(row);
  const processes = mapProcesses(row);
  const finderProducts = [...new Set(categories.map((category) => finderProductByCategory[category]))];
  const sourceUrls = splitList(row.source_urls);
  const websiteDomain = normalizedDomain(row.website);
  const extraLinks = sourceUrls
    .filter((url) => normalizedDomain(url) !== websiteDomain || url !== row.website)
    .map((url, index) => ({ label: sourceLabel(url, index), href: url }));
  const rawCapabilities = splitList(row.manufacturing_capabilities);
  const moqDisplay = polishMoqDisplay(row.moq);
  const overview = [
    row.product_types ? `Public sources list these products: ${row.product_types}.` : null,
    row.manufacturing_capabilities ? `Public sources describe these capabilities: ${row.manufacturing_capabilities}.` : null,
  ].filter(Boolean);

  return {
    slug,
    name: row.company_name,
    sites: [{ city: row.city || null, state: row.state }],
    locationDisplay: row.city ? `${row.city}, ${row.state}` : row.state,
    processes,
    finderProcesses: processes.filter((process) => ["hpp", "hot-fill", "retort", "cold-fill", "acidified"].includes(process)),
    finderProducts,
    categories,
    packaging: row.packaging_formats || null,
    productTypesPublished: row.product_types || null,
    manufacturingCapabilitiesPublished: row.manufacturing_capabilities || null,
    rawProductTags: splitList(row.product_types),
    rawCapabilityTags: rawCapabilities,
    moqDisplay: moqDisplay || null,
    publishedSmallMoq: hasPublishedSmallMoq(row.moq),
    certs: splitList(row.certifications),
    lastVerified: row.last_checked_date.slice(0, 10),
    listingStatus: row.status,
    confidence: row.confidence,
    website: { label: "Official website", href: row.website },
    extraLinks,
    phone: row.phone || null,
    publicEmail: row.public_email || null,
    operationType: normalizeOperationType(row.operation_type),
    operationTypePublished: row.operation_type || null,
    flags: splitList(row.flags),
    qualityNotes: row.quality_notes || null,
    masterDedupeKey: row.master_dedupe_key,
    overview,
    appearedOn: [],
    guideRows: {},
  };
}

const MOQ_DISPLAY_COPY = new Map([
  ["On The Money Minimums claimed (no numeric MOQ published)", "The company promotes ‘On The Money Minimums’ but does not publish a numeric minimum."],
  ["1 pallet (1,200 pounds) per Minnesota Dept. of Agriculture co-packer directory", "The Minnesota Department of Agriculture co-packer directory lists a one-pallet minimum (1,200 pounds)."],
  ["2,000-gallon standard batch runs (stated)", "The company states that its standard batch size is 2,000 gallons."],
  ["50 to 500 gallon batch sizes (Koldkiss co-packing page)", "Exact minimum not published. The company’s co-packing page states batch sizes from 50 to 500 gallons."],
  ["About 5,000 pods per SKU (site)", "The company says minimums start at about 5,000 pods per SKU."],
  ["No minimums stated on site (40-gallon kettles for small/trial batches)", "No minimum is published. The company lists 40-gallon kettles for small or trial batches."],
  ["Small-batch runs roughly 45-540 lbs finished product per flavor (stated)", "Exact minimum not published. The company states small-batch runs of roughly 45–540 pounds of finished product per flavor."],
  ["Lower minimum quantities claimed (exact units not published)", "The company states that it offers lower minimum quantities but does not publish an exact number."],
  ["400 units+ (published on Co-Packing and Private Label page)", "The company lists 400 units or more on its co-packing and private-label page."],
  ["500 lb raw processing batch; 300 lb bulk fermentation batch; 50 lb dehydration batch (directory-published)", "A Colorado co-packer directory lists batch sizes of 500 pounds for raw processing, 300 pounds for bulk fermentation, and 50 pounds for dehydration."],
  ["Pilot/small-scale runs from $3.5k (published as Low MOQs Starting @ $3.5k)", "The company says pilot and small-scale runs start at $3,500."],
  ["Low minimums stated for jerky only (exact units not published)", "The company states that jerky has low minimums but does not publish exact units."],
  ["15,000-500,000 packets (stated for small-batch packet production)", "The company states that small-batch packet runs range from 15,000 to 500,000 packets."],
]);

function polishMoqDisplay(value) {
  return MOQ_DISPLAY_COPY.get(value) ?? value;
}

function hasPublishedSmallMoq(value) {
  if (!value) return false;
  if (/\bunpublished\b|\bnot (?:published|stated)\b|\bno (?:per-SKU unit MOQ|minimums?|numeric)\b|exact (?:units?|MOQ)|minimums? vary/i.test(value)) return false;
  if (/\$\s*\d/i.test(value) && /\b(?:projects?|runs?|MOQ|minimum|start|starting|from)\b/i.test(value)) return true;
  return /\d[\d,.]*\s*(?:K\s*)?[-–]?\s*(?:units?|bottles?|gallons?|gal|lit(?:er|re)s?|pounds?|lbs?|pallets?|cases?|pouches?|packets?|pods?)\b/i.test(value);
}

function generate() {
  validateTaxonomyMappings();
  const rows = loadRows();
  for (const row of rows.filter((candidate) => SAFE_STATUSES.has(candidate.status))) {
    const claims = [row.product_types, row.manufacturing_capabilities, row.packaging_formats, row.certifications, row.moq];
    if (claims.some(Boolean) && splitList(row.source_urls).length === 0 && !row.website) {
      throw new Error(`${row.__source}: published claims require at least one source URL.`);
    }
  }
  const curatedIdentities = loadCuratedIdentities();
  const unsafeRows = rows.filter((row) => !SAFE_STATUSES.has(row.status));
  const { consolidated, repeatedMasterKeys, crossIdentityDuplicates } = consolidateSafeRows(rows);
  const existingDuplicates = [];
  const importCandidates = consolidated.filter((row) => {
    const match = existingMatch(row, curatedIdentities);
    if (!match) return true;
    existingDuplicates.push({ companyName: row.company_name, source: row.__source, kept: match.name, reason: "already present in curated catalog" });
    return false;
  });

  const byRank = (left, right) => cohortScore(right) - cohortScore(left) || left.company_name.localeCompare(right.company_name);
  const verified = importCandidates.filter((row) => row.status === "VERIFIED").sort(byRank);
  const listable = importCandidates
    .filter((row) => row.status === "LISTABLE")
    .filter((row) => !/shared_kitchen|incubator|not_turnkey_copack/.test(row.flags))
    .sort(byRank);
  const selectedRows = [
    ...verified.slice(0, TARGET_COUNT - TARGET_LISTABLE_COUNT),
    ...listable.slice(0, TARGET_LISTABLE_COUNT),
  ].sort((left, right) => left.company_name.localeCompare(right.company_name));

  if (selectedRows.length !== TARGET_COUNT) {
    throw new Error(`Expected ${TARGET_COUNT} selected manufacturers, received ${selectedRows.length}.`);
  }

  const usedSlugs = new Set(curatedIdentities.map((identity) => identity.slug));
  const plants = selectedRows.map((row) => toPlant(row, usedSlugs));
  assert.equal(new Set(plants.map((plant) => plant.slug)).size, plants.length, "Imported slugs must be unique.");
  assert.equal(new Set(plants.map((plant) => plant.masterDedupeKey)).size, plants.length, "Imported master keys must be unique.");
  assert.ok(plants.every((plant) => SAFE_STATUSES.has(plant.listingStatus)), "Unsafe statuses cannot enter the generated catalog.");
  const selectedKeys = new Set(selectedRows.map((row) => row.master_dedupe_key));
  const safeNotSelected = importCandidates.filter((row) => !selectedKeys.has(row.master_dedupe_key));
  const categoryCounts = Object.fromEntries(categoryRules.map(([category]) => [
    category,
    plants.filter((plant) => plant.categories.includes(category)).length,
  ]));
  const taxonomyGaps = [...new Set(plants.filter((plant) => plant.categories.length === 0).flatMap((plant) => plant.rawProductTags))].sort();
  const states = [...new Set(plants.flatMap((plant) => plant.sites.map((site) => site.state)))].sort();
  const report = {
    generatedAt: "2026-08-23",
    sourceFiles: readdirSync(INPUT_DIRECTORY).filter((file) => file.endsWith(".csv")).sort(),
    sourceRows: rows.length,
    safeRows: rows.filter((row) => SAFE_STATUSES.has(row.status)).length,
    imported: plants.length,
    verified: plants.filter((plant) => plant.listingStatus === "VERIFIED").length,
    listable: plants.filter((plant) => plant.listingStatus === "LISTABLE").length,
    states,
    categoryCounts,
    taxonomyGaps,
    skipped: {
      byStatus: Object.fromEntries(["NEEDS_REVIEW", "EXCLUDE"].map((status) => [status, unsafeRows.filter((row) => row.status === status).length])),
      repeatedMasterKey: repeatedMasterKeys.length,
      crossIdentityDuplicate: crossIdentityDuplicates.length,
      alreadyCurated: existingDuplicates.length,
      safeNotSelected: safeNotSelected.length,
    },
    skippedRecords: {
      unsafeStatus: unsafeRows.map((row) => ({ companyName: row.company_name, source: row.__source, reason: row.status })),
      repeatedMasterKey: repeatedMasterKeys,
      crossIdentityDuplicate: crossIdentityDuplicates,
      alreadyCurated: existingDuplicates,
      safeNotSelected: safeNotSelected.map((row) => ({ companyName: row.company_name, source: row.__source, reason: "outside initial 50-record cohort" })),
    },
  };

  const catalog = [
    "/* This file is generated by scripts/import-manufacturers.mjs. Do not edit by hand. */",
    'import type { Plant } from "./types";',
    "",
    `export const IMPORTED_PLANTS = ${JSON.stringify(plants, null, 2)} satisfies Plant[];`,
    "",
  ].join("\n");
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;

  if (process.argv.includes("--check")) {
    const catalogMatches = readFileSync(GENERATED_CATALOG, "utf8") === catalog;
    const reportMatches = readFileSync(GENERATED_REPORT, "utf8") === reportJson;
    if (!catalogMatches || !reportMatches) throw new Error("Generated manufacturer files are stale. Run npm run manufacturers:import.");
    console.log(`Manufacturer import is current: ${plants.length} records (${report.verified} verified, ${report.listable} listable).`);
    return;
  }

  writeFileSync(GENERATED_CATALOG, catalog);
  writeFileSync(GENERATED_REPORT, reportJson);
  console.log(`Imported ${plants.length} manufacturers (${report.verified} verified, ${report.listable} listable).`);
}

generate();
