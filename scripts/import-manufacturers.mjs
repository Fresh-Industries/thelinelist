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
const CATALOG_BASELINE = join(ROOT, "data/manufacturer-imports/catalog-baseline.json");
const SAFE_STATUSES = new Set(["VERIFIED", "LISTABLE"]);
const ALL_STATUSES = ["VERIFIED", "LISTABLE", "NEEDS_REVIEW", "EXCLUDE"];
const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");

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
  ["water", /\b(?:bottled|packaged|sparkling|still|spring|mineral) waters?\b|^waters?$/i],
  ["hot-sauce", /\bhot sauces?\b/i],
  ["sauce", /\b(sauces?|condiments?|BBQ|barbecue|mustards?|ketchup|syrups?)\b/i],
  ["salsa", /\bsalsas?\b/i],
  ["dressings-marinades", /\b(dressings?|marinades?|vinaigrettes?)\b/i],
  ["dips-hummus", /\b(dips?|hummus)\b/i],
  ["snacks", /\b(snacks?|popcorn|bars? and bites?|jerky|meat snacks?|roasted nuts?|granolas?|extruded snacks?)\b/i],
  ["bakery", /\b(bakery|baked goods?|breads?|bagels?|cookies?|batters?|cupcakes?|coffee cakes?|(?:bakery|pastry|pie) fillings?|icings?)\b/i],
  ["confectionery", /\b(candy|confections?|panned products?|sugar floss)\b/i],
  ["spices-dry-mixes", /\b(spices?|seasonings?|dry (?:mixes?|blends?|goods|(?:soup )?bases?)|powdered (?:drink )?mixes?|powdered bases?|rubs?|salts?)\b/i],
  ["supplements", /\b(dietary supplements?|sports nutrition|protein(?:\/collagen)? supplements?|capsules?|supplement concepts?)\b/i],
  ["dry-coffee-tea", /\b(K-Cups?|coffee pods?|tea pods?|functional beverage pods?|loose leaf tea|private label coffee|tea pouches?)\b/i],
  ["dairy", /(?<!non[- ])\b(dairy|milk|butter|sour cream|cottage cheese|ice cream mix)\b/i],
  ["frozen-foods", /\bfrozen\b/i],
  ["prepared-refrigerated-foods", /\b(refrigerated foods?|refrigerated meals?|refrigerated prepared (?:foods?|beans?|meals?|dips?|soups?)|fresh refrigerated)\b/i],
  ["shelf-stable-meals", /\b(shelf[- ]stable (?:RTE|ready[- ]to[- ]eat|meals?|foods?|sides?)|retort foods?)\b/i],
  ["soups-broths-entrees", /\b(soups?|broths?|stews?|chilis?|entr[eé]es?)\b/i],
  ["fermented-foods", /(?<!un)\b(?:lacto[- ])?fermented (?:foods?|beverages?|products?)\b|\blacto[- ]fermented\b/i],
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
  "dips-hummus": "sauce",
  "prepared-refrigerated-foods": "prepared-rte",
  "shelf-stable-meals": "prepared-rte",
  "soups-broths-entrees": "prepared-rte",
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
  return rows.slice(1).filter((values) => values.some(Boolean)).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}. Quote values that contain commas.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
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

function sourceLabel(url, index, websiteDomain) {
  const domain = normalizedDomain(url);
  const pathname = (() => {
    try { return new URL(url).pathname.toLowerCase(); } catch { return ""; }
  })();
  if (domain === websiteDomain) {
    if (/cert|quality|compliance/.test(pathname)) return "Certifications and quality";
    if (/facilit|plant|location/.test(pathname)) return "Facility";
    if (/service|capabilit|co-pack|manufactur|product/.test(pathname)) return "Services and capabilities";
    if (/contact/.test(pathname)) return "Contact";
    const pageName = decodeURIComponent(pathname).split("/").filter(Boolean).at(-1);
    if (pageName) return pageName.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    return "Company overview";
  }
  if (domain === "businesswire.com") return "Ownership change announcement";
  if (domain === "oregon.gov") return "Oregon co-packer locator";
  if (domain === "specialtyfoodresource.com") return "Specialty Food Resource listing";
  if (domain === "docs.google.com") return "Published co-packer directory";
  if (domain === "pickyourown.org" && /\.pdf$/.test(pathname)) return "Published co-packer directory PDF";
  if (domain === "pickyourown.org" && /copackers-/.test(pathname)) return "PickYourOwn state co-packer listing";
  if (/\.gov$/.test(domain)) return `${domain} public-agency source`;
  if (/\.edu$/.test(domain)) return `${domain} university source`;
  if (domain) {
    const pageName = decodeURIComponent(pathname).split("/").filter(Boolean).at(-1);
    if (pageName) return `${domain} — ${pageName.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`;
    return `${domain} company overview`;
  }
  return `Public source ${index + 1}`;
}

function mapCategories(row) {
  const disclosedProducts = splitList(row.product_types);
  return categoryRules
    .filter(([category, pattern]) => {
      if (category === "functional-beverages" && /\b(pods?|K-Cups?|dry ingredients?|powder(?:ed)?)\b/i.test(row.product_types)) return false;
      return disclosedProducts.some((product) => {
      if (category === "soups-broths-entrees" && /\b(dry|powder(?:ed)?|mix(?:es)?|bases?)\b/i.test(product)) return false;
      if (category === "dairy" && /\b(?:fruit|nut|seed|peanut|almond|cashew|sunflower|apple|pumpkin) butters?\b/i.test(product)) return false;
      return pattern.test(product);
      });
    })
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
  assert.deepEqual(categoriesFor("tea pods"), ["dry-coffee-tea"]);
  assert.deepEqual(categoriesFor("bakery products"), ["bakery"]);
  assert.deepEqual(categoriesFor("dry mixes (cake/brownie/soup); powdered drink mixes"), ["spices-dry-mixes"]);
  assert.deepEqual(categoriesFor("functional beverage pods"), ["dry-coffee-tea"]);

  const processesFor = (manufacturing_capabilities) => mapProcesses({ manufacturing_capabilities });
  assert.deepEqual(processesFor("Acidified; hot fill; HPP; retort; cold fill"), ["hpp", "hot-fill", "retort", "cold-fill", "acidified"]);
  assert.deepEqual(processesFor("Ambient filling"), []);
}

function normalizeOperationType(value) {
  const normalized = normalizeWords(value);
  if (/shared kitchen|incubator/.test(normalized)) return "shared-kitchen-incubator";
  if (/brand with co pack/.test(normalized)) return "brand-with-co-pack";
  if (/private label producer/.test(normalized)) return "private-label-producer";
  if (/toll processor|toll processing|tolling/.test(normalized)) return "toll-processor";
  if (/contract packager|contract packaging/.test(normalized)) return "contract-packager";
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

function chooseRicherRow(left, right) {
  const leftScore = dataQualityScore(left);
  const rightScore = dataQualityScore(right);
  if (rightScore !== leftScore) return rightScore > leftScore ? right : left;
  if (right.status !== left.status) return right.status === "VERIFIED" ? right : left;
  return right.__source.localeCompare(left.__source) < 0 ? right : left;
}

function loadRows() {
  const files = readdirSync(INPUT_DIRECTORY).filter((file) => file.endsWith(".csv")).sort();
  const rows = [];
  const invalidRows = [];
  for (const file of files) {
    const parsed = parseCsv(readFileSync(join(INPUT_DIRECTORY, file), "utf8"));
    parsed.forEach((row, rowIndex) => {
      const source = `${file}:${rowIndex + 2}`;
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        invalidRows.push({
          companyName: typeof row.company_name === "string" ? row.company_name : "Unknown",
          source,
          status: typeof row.status === "string" ? row.status : "",
          issues: result.error.issues.map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`),
        });
        return;
      }
      rows.push({ ...result.data, __source: source });
    });
  }
  return { files, rows, invalidRows };
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

function rowAliases(row) {
  const aliases = new Set([row.company_name, row.master_name].filter(Boolean).map(normalizeWords));
  const relationshipText = `${row.company_name}; ${row.master_name}; ${row.quality_notes}`;
  const patterns = [
    /(?:formerly|former(?:ly known as)?|fka)\s+([^.;()]+)/gi,
    /(?:now|acquired by|owned by|dba|doing business as)\s+([^.;()]+)/gi,
    /\(([^)]+)\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of relationshipText.matchAll(pattern)) {
      const alias = normalizeWords(match[1] ?? "");
      if (alias.length >= 4) aliases.add(alias);
    }
  }
  return [...aliases].filter(Boolean);
}

function aliasesOverlap(left, right) {
  const leftAliases = "company_name" in left ? rowAliases(left) : [normalizeWords(left.name)];
  const rightAliases = "company_name" in right ? rowAliases(right) : [normalizeWords(right.name)];
  return leftAliases.some((leftAlias) => rightAliases.some((rightAlias) => sameCompanyName(leftAlias, rightAlias)));
}

function existingMatch(row, curatedIdentities) {
  const domain = normalizedDomain(row.website);
  return curatedIdentities.find((identity) => (
    (domain && identity.domain === domain)
    || (aliasesOverlap(row, identity)
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
      || (aliasesOverlap(row, candidate)
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
  const finderProducts = [...new Set(categories.flatMap((category) => (
    finderProductByCategory[category] ? [finderProductByCategory[category]] : []
  )))];
  const sourceUrls = splitList(row.source_urls);
  const websiteDomain = normalizedDomain(row.website);
  const hasExternalSource = sourceUrls.some((url) => normalizedDomain(url) && normalizedDomain(url) !== websiteDomain);
  const seenLabels = new Map();
  const extraLinks = sourceUrls
    .filter((url) => normalizedDomain(url) !== websiteDomain || url !== row.website)
    .map((url, index) => {
      const baseLabel = sourceLabel(url, index, websiteDomain);
      const count = (seenLabels.get(baseLabel) ?? 0) + 1;
      seenLabels.set(baseLabel, count);
      return { label: count === 1 ? baseLabel : `${baseLabel} ${count}`, href: url };
    });
  const rawCapabilities = splitList(row.manufacturing_capabilities);
  const moqDisplay = polishMoqDisplay(row.moq);
  const smallRunSignal = getSmallRunSignal(row, sourceUrls, moqDisplay);
  const primaryLink = row.website || sourceUrls[0];
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
    claimSource: row.status === "LISTABLE" ? "directory-reported" : hasExternalSource ? "mixed-public-sources" : "company-published",
    website: { label: row.website ? "Official website" : "Public source listing", href: primaryLink },
    extraLinks,
    phone: row.phone || null,
    publicEmail: row.public_email || null,
    operationType: normalizeOperationType(row.operation_type),
    operationTypePublished: row.operation_type || null,
    fieldSourceUrls: splitList(row.flags).includes("official_company_source") ? {
      ...(row.product_types ? { products: sourceUrls } : {}),
      ...(row.manufacturing_capabilities ? { processes: sourceUrls } : {}),
      ...(row.packaging_formats ? { packaging: sourceUrls } : {}),
      ...(row.moq ? { minimums: sourceUrls } : {}),
      ...(row.certifications ? { certifications: sourceUrls } : {}),
    } : undefined,
    smallRunSignal,
    needsCurrentOwnershipVerification: splitList(row.flags).includes("needs_current_ownership_verification") || undefined,
    introductionsPaused: splitList(row.flags).includes("introductions_paused") || undefined,
    verificationNotice: splitList(row.flags).includes("needs_current_ownership_verification")
      ? "Current ownership or operating details need verification. Contact help is paused until the active operating entity, capabilities, and public contact details are confirmed."
      : undefined,
    overview,
    appearedOn: [],
    guideRows: {},
  };
}

function getSmallRunSignal(row, sourceUrls, moqDisplay) {
  if (sourceUrls.length === 0) return undefined;
  const moq = row.moq.trim();
  if (moq && !/^(?:unknown|not stated|none stated|n\/a)$/i.test(moq)) {
    return { evidence: moqDisplay || moq, sourceUrls };
  }
  const segment = splitList(row.manufacturing_capabilities).find((value) => (
    /\b(?:small[- ]batch|test[- ]run|pilot[- ]run|pilot production|first[- ]run|trial[- ]batch|short[- ]run|low[- ]volume)\b/i.test(value)
  ));
  const phrase = segment?.match(
    /\b(?:small[- ]batch(?: production runs? for test items(?: as well as large volume)?| or long[- ]run options?)?|test[- ]runs?|pilot[- ]runs?|pilot production|first[- ]runs?|trial[- ]batches?|short[- ]runs?|low[- ]volume(?: production)?)\b/i,
  )?.[0];
  if (phrase) return { evidence: `Public sources list ${phrase}.`, sourceUrls };
  const flags = splitList(row.flags);
  if (flags.some((flag) => /low_moq_claimed_no_number/i.test(flag))) {
    return { evidence: "Public sources state that the company offers a low minimum; no number is published.", sourceUrls };
  }
  if (flags.some((flag) => /small_batch/i.test(flag))) {
    return { evidence: "Public sources list a small-batch production option.", sourceUrls };
  }
  if (flags.some((flag) => /test_run/i.test(flag))) {
    return { evidence: "Public sources list a test-run production option.", sourceUrls };
  }
  if (flags.some((flag) => /pilot/i.test(flag))) {
    return { evidence: "Public sources list a pilot-run production option.", sourceUrls };
  }
  if (flags.some((flag) => /first_run/i.test(flag))) {
    return { evidence: "Public sources list a first-run production signal.", sourceUrls };
  }
  return undefined;
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
  return (MOQ_DISPLAY_COPY.get(value) ?? value)
    .replace(/\s*\((?:site|stated|directory-published|published|origin (?:processing |private-label |co-pack |about )?(?:page|homepage|FAQ))[^)]*\)/gi, "")
    .replace(/\bclaimed \(/gi, "(")
    .replace(/\s+claimed(?=[).,;]|$)/gi, "")
    .replace(/\b(?:Page|FAQ):\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasPublishedSmallMoq(value) {
  if (!value) return false;
  if (/\b(?:company )?(?:states?|lists?|publishes?|offers?) no minimum order\b/i.test(value)) return true;
  if (/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) batches? per (?:flavor|SKU)\b/i.test(value)) return true;
  if (/\bunpublished\b|\bnot (?:published|stated)\b|\bno (?:per-SKU unit MOQ|minimums?|numeric)\b|exact (?:units?|MOQ)|minimums? vary/i.test(value)) return false;
  if (/\$\s*\d/i.test(value) && /\b(?:projects?|runs?|MOQ|minimum|start|starting|from)\b/i.test(value)) return true;
  return /\d[\d,.]*\s*(?:K\s*)?[-–]?\s*(?:units?|bottles?|gallons?|gal|lit(?:er|re)s?|pounds?|lbs?|pallets?|cases?|pouches?|packets?|pods?)\b/i.test(value);
}

function readExistingGeneratedPlants() {
  try {
    const source = readFileSync(GENERATED_CATALOG, "utf8");
    const json = source.match(/export const IMPORTED_PLANTS = ([\s\S]+) satisfies Plant\[\];/)?.[1];
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

function readPreviousCatalogRecords() {
  try {
    const report = JSON.parse(readFileSync(GENERATED_REPORT, "utf8"));
    return Array.isArray(report.catalogRecords) ? report.catalogRecords : [];
  } catch {
    return [];
  }
}

function readPreviousReport() {
  try {
    return JSON.parse(readFileSync(GENERATED_REPORT, "utf8"));
  } catch {
    return null;
  }
}

function readCatalogBaseline() {
  try {
    const baseline = JSON.parse(readFileSync(CATALOG_BASELINE, "utf8"));
    return baseline.records;
  } catch {
    return [];
  }
}

function findBaselinePlant(row, baselineRecords) {
  const exact = baselineRecords.find((record) => record.masterDedupeKey === row.master_dedupe_key);
  if (exact) return exact.plant;
  return baselineRecords.find((record) => {
    const site = record.plant.sites?.[0];
    const sameDomain = normalizedDomain(row.website)
      && normalizedDomain(row.website) === normalizedDomain(record.plant.website?.href ?? "");
    return (sameDomain || aliasesOverlap(row, record.plant))
      && site?.state === row.state
      && (row.city ? site?.city?.toLowerCase() === row.city.toLowerCase() : true);
  })?.plant;
}

function uniqueValues(...values) {
  return [...new Set(values.flat().filter(Boolean))];
}

function mergeLinks(previous = [], next = []) {
  const byUrl = new Map();
  for (const link of [...previous, ...next]) byUrl.set(link.href, link);
  return [...byUrl.values()];
}

function mergeFieldSources(previous, next) {
  if (!previous && !next) return undefined;
  const fields = ["products", "processes", "packaging", "minimums", "certifications"];
  return Object.fromEntries(fields.flatMap((field) => {
    const urls = uniqueValues(previous?.[field] ?? [], next?.[field] ?? []);
    return urls.length > 0 ? [[field, urls]] : [];
  }));
}

function mergeStrongerPlant(previous, next) {
  if (!previous) return next;
  return {
    ...previous,
    ...next,
    slug: previous.slug || next.slug,
    processes: uniqueValues(previous.processes ?? [], next.processes ?? []),
    finderProcesses: uniqueValues(previous.finderProcesses ?? [], next.finderProcesses ?? []),
    finderProducts: uniqueValues(previous.finderProducts ?? [], next.finderProducts ?? []),
    categories: uniqueValues(previous.categories ?? [], next.categories ?? []),
    rawProductTags: uniqueValues(previous.rawProductTags ?? [], next.rawProductTags ?? []),
    rawCapabilityTags: uniqueValues(previous.rawCapabilityTags ?? [], next.rawCapabilityTags ?? []),
    certs: uniqueValues(previous.certs ?? [], next.certs ?? []),
    packaging: next.packaging || previous.packaging || null,
    productTypesPublished: next.productTypesPublished || previous.productTypesPublished || null,
    manufacturingCapabilitiesPublished: next.manufacturingCapabilitiesPublished || previous.manufacturingCapabilitiesPublished || null,
    moqDisplay: next.moqDisplay || previous.moqDisplay || null,
    publishedSmallMoq: Boolean(previous.publishedSmallMoq || next.publishedSmallMoq),
    listingStatus: previous.listingStatus === "VERIFIED" || next.listingStatus === "VERIFIED" ? "VERIFIED" : "LISTABLE",
    claimSource: previous.claimSource === "mixed-public-sources" || next.claimSource === "mixed-public-sources"
      ? "mixed-public-sources"
      : next.claimSource || previous.claimSource,
    extraLinks: mergeLinks(previous.extraLinks, next.extraLinks),
    phone: next.phone || previous.phone || null,
    publicEmail: next.publicEmail || previous.publicEmail || null,
    fieldSourceUrls: mergeFieldSources(previous.fieldSourceUrls, next.fieldSourceUrls),
    needsCurrentOwnershipVerification: Boolean(previous.needsCurrentOwnershipVerification || next.needsCurrentOwnershipVerification) || undefined,
    introductionsPaused: Boolean(previous.introductionsPaused || next.introductionsPaused) || undefined,
    verificationNotice: next.verificationNotice || previous.verificationNotice,
  };
}

function recordFingerprint(plant) {
  return createHash("sha256").update(JSON.stringify(plant)).digest("hex");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function batchNumber(source) {
  return source.match(/batch-(\d+)/)?.[1] ?? "";
}

function generate() {
  validateTaxonomyMappings();
  const loaded = loadRows();
  const invalidRows = [...loaded.invalidRows];
  const usableRows = loaded.rows.filter((row) => {
    if (!SAFE_STATUSES.has(row.status)) return true;
    const sourceUrls = splitList(row.source_urls);
    const claims = [row.product_types, row.manufacturing_capabilities, row.packaging_formats, row.certifications, row.moq];
    const usablePublicUrls = [row.website, ...sourceUrls].filter(Boolean).every(isHttpUrl);
    if (claims.some(Boolean) && sourceUrls.length === 0 && !row.website) {
      invalidRows.push({ companyName: row.company_name, source: row.__source, status: row.status, issues: ["Safe public claims require at least one public source URL."] });
      return false;
    }
    if (!row.website && sourceUrls.length === 0) {
      invalidRows.push({ companyName: row.company_name, source: row.__source, status: row.status, issues: ["A public listing needs a website or source URL."] });
      return false;
    }
    if (!usablePublicUrls) {
      invalidRows.push({ companyName: row.company_name, source: row.__source, status: row.status, issues: ["Website and source URLs must use HTTP or HTTPS."] });
      return false;
    }
    return true;
  });

  const curatedIdentities = loadCuratedIdentities();
  const unsafeRows = usableRows.filter((row) => !SAFE_STATUSES.has(row.status));
  const safeRows = usableRows.filter((row) => SAFE_STATUSES.has(row.status));
  const { consolidated, repeatedMasterKeys, crossIdentityDuplicates } = consolidateSafeRows(usableRows);
  const existingDuplicates = [];
  const importCandidates = consolidated.filter((row) => {
    const match = existingMatch(row, curatedIdentities);
    if (!match) return true;
    existingDuplicates.push({
      companyName: row.company_name,
      source: row.__source,
      kept: match.name,
      reason: "already present in the stronger hand-curated catalog",
      masterDedupeKey: row.master_dedupe_key,
    });
    return false;
  }).sort((left, right) => left.company_name.localeCompare(right.company_name));

  const previousPlants = readExistingGeneratedPlants();
  const previousReport = readPreviousReport();
  const previousRecords = readPreviousCatalogRecords();
  const baselineRecords = readCatalogBaseline();
  const previousByKey = new Map(previousRecords.map((record) => [record.masterDedupeKey, record]));
  for (const plant of previousPlants) {
    if (plant.masterDedupeKey && !previousByKey.has(plant.masterDedupeKey)) {
      previousByKey.set(plant.masterDedupeKey, {
        masterDedupeKey: plant.masterDedupeKey,
        slug: plant.slug,
        fingerprint: recordFingerprint(plant),
      });
    }
  }

  const usedSlugs = new Set(curatedIdentities.map((identity) => identity.slug));
  const plants = importCandidates.map((row) => {
    const previous = previousByKey.get(row.master_dedupe_key);
    let plant = toPlant(row, usedSlugs);
    if (previous?.slug && !usedSlugs.has(previous.slug)) {
      usedSlugs.delete(plant.slug);
      plant.slug = previous.slug;
      usedSlugs.add(plant.slug);
    }
    plant = mergeStrongerPlant(findBaselinePlant(row, baselineRecords), plant);
    return plant;
  });
  assert.equal(new Set(plants.map((plant) => plant.slug)).size, plants.length, "Imported slugs must be unique.");
  assert.equal(new Set(importCandidates.map((row) => row.master_dedupe_key)).size, importCandidates.length, "Imported master keys must be unique.");
  assert.ok(plants.every((plant) => SAFE_STATUSES.has(plant.listingStatus)), "Unsafe statuses cannot enter the generated catalog.");

  const catalogRecords = importCandidates.map((row, index) => ({
    masterDedupeKey: row.master_dedupe_key,
    companyName: row.company_name,
    slug: plants[index].slug,
    source: row.__source,
    status: row.status,
    fingerprint: recordFingerprint(plants[index]),
  }));
  const changes = { new: 0, updated: 0, unchanged: 0 };
  const changeByKey = new Map();
  for (const record of catalogRecords) {
    const previous = previousByKey.get(record.masterDedupeKey);
    const change = !previous ? "new" : previous.fingerprint === record.fingerprint ? "unchanged" : "updated";
    changes[change] += 1;
    changeByKey.set(record.masterDedupeKey, change);
  }

  const categoryCounts = Object.fromEntries(categoryRules.map(([category]) => [
    category,
    plants.filter((plant) => plant.categories.includes(category)).length,
  ]));
  const taxonomyGaps = [...new Set(plants.filter((plant) => plant.categories.length === 0).flatMap((plant) => plant.rawProductTags))].sort();
  const states = [...new Set(plants.flatMap((plant) => plant.sites.map((site) => site.state)))].sort();
  const duplicates = [...repeatedMasterKeys, ...crossIdentityDuplicates, ...existingDuplicates];
  const skippedRecords = [
    ...unsafeRows.map((row) => ({ companyName: row.company_name, source: row.__source, reason: row.status })),
    ...duplicates,
    ...invalidRows.map((row) => ({ companyName: row.companyName, source: row.source, reason: `INVALID: ${row.issues.join(" ")}` })),
  ];
  const batch26Records = loaded.rows.filter((row) => batchNumber(row.__source) === "26").map((row) => {
    if (!SAFE_STATUSES.has(row.status)) {
      return { companyName: row.company_name, source: row.__source, disposition: "skipped", reason: row.status };
    }
    const curated = existingDuplicates.find((entry) => entry.source === row.__source);
    if (curated) {
      return { companyName: row.company_name, source: row.__source, disposition: "duplicate", reason: curated.reason, kept: curated.kept };
    }
    const repeated = repeatedMasterKeys.find((entry) => entry.source === row.__source);
    if (repeated) {
      return { companyName: row.company_name, source: row.__source, disposition: "duplicate", reason: "repeated master_dedupe_key" };
    }
    const cross = crossIdentityDuplicates.find((entry) => entry.source === row.__source);
    if (cross) {
      return { companyName: row.company_name, source: row.__source, disposition: "duplicate", reason: cross.reason, kept: cross.kept };
    }
    return {
      companyName: row.company_name,
      source: row.__source,
      disposition: changeByKey.has(row.master_dedupe_key) ? "imported" : "skipped",
      reason: changeByKey.has(row.master_dedupe_key) ? `${row.status} public record` : "consolidated into another canonical record",
    };
  });

  const statusCounts = Object.fromEntries(ALL_STATUSES.map((status) => [
    status,
    loaded.rows.filter((row) => row.status === status).length,
  ]));
  const report = {
    generatedAt: usableRows.map((row) => row.last_checked_date.slice(0, 10)).sort().at(-1),
    mode: APPLY ? "apply" : CHECK ? "check" : "dry-run",
    sourceFiles: loaded.files,
    sourceRows: loaded.rows.length + loaded.invalidRows.length,
    parsedRows: loaded.rows.length,
    sourceStatusCounts: statusCounts,
    safeRows: safeRows.length,
    invalid: invalidRows.length,
    imported: plants.length,
    verified: plants.filter((plant) => plant.listingStatus === "VERIFIED").length,
    listable: plants.filter((plant) => plant.listingStatus === "LISTABLE").length,
    changes,
    duplicates: duplicates.length,
    skipped: skippedRecords.length,
    finalCatalogCount: curatedIdentities.length + plants.length,
    smallRunSignals: plants.filter((plant) => plant.smallRunSignal).length,
    internalSignalAudit: {
      flaggedCandidates: importCandidates.filter((row) => /startup_friendly|first_run|small_batch|test_run|pilot|low_moq|flexible_minimum|moq_published|published_moq/i.test(row.flags)).length,
      flaggedWithoutPublishableEvidence: importCandidates
        .filter((row, index) => /startup_friendly|first_run|small_batch|test_run|pilot|low_moq|flexible_minimum|moq_published|published_moq/i.test(row.flags) && !plants[index].smallRunSignal)
        .map((row) => ({ companyName: row.company_name, source: row.__source, flags: splitList(row.flags) })),
    },
    states,
    categoryCounts,
    taxonomyGaps,
    duplicateBreakdown: {
      repeatedMasterKey: repeatedMasterKeys.length,
      crossIdentityDuplicate: crossIdentityDuplicates.length,
      alreadyCurated: existingDuplicates.length,
    },
    invalidRecords: invalidRows,
    duplicateRecords: duplicates,
    skippedRecords,
    batch26Records,
    catalogRecords,
  };

  const catalog = [
    "/* This file is generated by scripts/import-manufacturers.mjs. Do not edit by hand. */",
    'import type { Plant } from "./types";',
    "",
    `export const IMPORTED_PLANTS = ${JSON.stringify(plants, null, 2)} satisfies Plant[];`,
    "",
  ].join("\n");
  const appliedChanges = previousReport?.appliedChanges ?? previousReport?.changes ?? changes;
  const persistedReport = {
    ...report,
    mode: "apply",
    changes: appliedChanges,
    appliedChanges,
    lastApplyChanges: APPLY ? changes : previousReport?.lastApplyChanges ?? appliedChanges,
  };
  const reportJson = `${JSON.stringify(persistedReport, null, 2)}\n`;

  if (CHECK) {
    const catalogMatches = readFileSync(GENERATED_CATALOG, "utf8") === catalog;
    const reportMatches = readFileSync(GENERATED_REPORT, "utf8") === reportJson;
    if (!catalogMatches || !reportMatches) throw new Error("Generated manufacturer files are stale. Run npm run manufacturers:import.");
    console.log(`Manufacturer import is current: ${plants.length} imported, ${report.finalCatalogCount} total.`);
    return;
  }

  if (APPLY) {
    writeFileSync(GENERATED_CATALOG, catalog);
    writeFileSync(GENERATED_REPORT, reportJson);
  }
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    sourceRows: report.sourceRows,
    sourceStatusCounts: report.sourceStatusCounts,
    safeRows: report.safeRows,
    imported: report.imported,
    finalCatalogCount: report.finalCatalogCount,
    changes: report.changes,
    duplicates: report.duplicates,
    skipped: report.skipped,
    invalid: report.invalid,
    smallRunSignals: report.smallRunSignals,
    flaggedSignalCandidates: report.internalSignalAudit.flaggedCandidates,
    flaggedWithoutPublishableEvidence: report.internalSignalAudit.flaggedWithoutPublishableEvidence.length,
  }, null, 2));
}

generate();
