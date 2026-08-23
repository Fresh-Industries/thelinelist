import "./assert";
import { STATE_NAMES } from "./labels";
import { VERIFIED_PLANTS } from "./plants";
import { isProductCategorySlug, plantMatchesCategory } from "./categories";
import type {
  CertificationFilter,
  DirectoryQuery,
  FinderProcess,
  FinderProduct,
  FutureSliceKeys,
  GuideId,
  PackagingFilter,
  Plant,
} from "./types";

/**
 * Access layer for the public directory.
 *
 * Today this reads the local TypeScript catalog. Later this file can call a
 * database without changing cards, company pages, or the finder.
 *
 * Ranking is organic only (name, then slug). Sponsored slots must never be
 * inserted into this list or used as a sort key.
 */
export function getVerifiedPlants(): Plant[] {
  return VERIFIED_PLANTS;
}

export function getPlantBySlug(slug: string): Plant | undefined {
  return VERIFIED_PLANTS.find((plant) => plant.slug === slug);
}

export function getPlantSlugs(): string[] {
  return VERIFIED_PLANTS.map((plant) => plant.slug);
}

export function plantsForGuide(guide: GuideId): Plant[] {
  return VERIFIED_PLANTS.filter((plant) => plant.appearedOn.includes(guide));
}

export function filterPlants(query: DirectoryQuery): Plant[] {
  return VERIFIED_PLANTS.filter((plant) => matchesQuery(plant, query)).sort(
    (left, right) => left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug),
  );
}

export function matchesQuery(plant: Plant, query: DirectoryQuery): boolean {
  if (query.product && !matchesFinderProduct(plant, query.product)) {
    return false;
  }
  if (query.category && !plantMatchesCategory(plant, query.category)) {
    return false;
  }
  if (query.process && !matchesFinderProcess(plant, query.process)) {
    return false;
  }
  if ((query.smallMoq || query.moqDisclosed) && !plant.publishedSmallMoq) {
    return false;
  }
  if (query.packaging && !matchesPackaging(plant, query.packaging)) {
    return false;
  }
  if (query.certification && !matchesCertification(plant, query.certification)) {
    return false;
  }
  if (query.state && !plant.sites.some((site) => site.state === query.state)) {
    return false;
  }
  return true;
}

/**
 * Empty product tags mean unknown, not a match. They remain visible only when
 * no product filter is active.
 */
function matchesFinderProduct(plant: Plant, product: FinderProduct): boolean {
  return plant.finderProducts.includes(product);
}

/**
 * Empty process tags mean unknown, not a match. Never claim a capability from
 * an absent tag.
 */
function matchesFinderProcess(plant: Plant, process: FinderProcess): boolean {
  if (plant.finderProcesses.includes(process)) return true;
  return false;
}

function matchesPackaging(plant: Plant, packaging: PackagingFilter): boolean {
  if (!plant.packaging) return false;
  const patterns: Record<PackagingFilter, RegExp> = {
    can: /\b(can|cans|canning|aluminum)\b/i,
    bottle: /\b(bottle|bottles|bottling|PET|HDPE)\b/i,
    jar: /\b(jar|jars|glass)\b/i,
    pouch: /\b(pouch|pouches|sachet|sachets|bag|bags|stick pack)\b/i,
    other: /\b(cup|cups|tub|tubs|tray|trays|carton|cartons|drum|drums|tote|totes|pail|pails)\b/i,
  };
  return patterns[packaging].test(plant.packaging);
}

function matchesCertification(plant: Plant, certification: CertificationFilter): boolean {
  const certs = plant.certs.join(" ");
  const patterns: Record<CertificationFilter, RegExp> = {
    organic: /\borganic\b/i,
    kosher: /\bkosher\b|KOF-K|STAR-K/i,
    halal: /\bhalal\b/i,
    "gluten-free": /gluten[- ]?free|GFCO/i,
    "non-gmo": /non[- ]?GMO/i,
    sqf: /\bSQF\b/i,
  };
  return patterns[certification].test(certs);
}

export function countByFinderProduct(product: FinderProduct): number {
  return VERIFIED_PLANTS.filter((plant) => plant.finderProducts.includes(product)).length;
}

export function verifiedStates(): string[] {
  const states = new Set<string>();
  for (const plant of VERIFIED_PLANTS) {
    for (const site of plant.sites) {
      if (site.state in STATE_NAMES) {
        states.add(site.state);
      }
    }
  }
  return [...states].sort((a, b) => {
    const left = STATE_NAMES[a] ?? a;
    const right = STATE_NAMES[b] ?? b;
    return left.localeCompare(right);
  });
}

/**
 * Count verified plants for a future programmatic slice.
 * Routes like `/copackers/texas` are not generated in this pass.
 */
export function countVerifiedSlice(keys: FutureSliceKeys): number {
  const query: DirectoryQuery = {
    state: keys.state,
    product: keys.product,
    process: keys.process,
  };
  return filterPlants(query).length;
}

export function parseDirectoryQuery(
  searchParams: Record<string, string | string[] | undefined>,
): DirectoryQuery {
  return {
    product: readProduct(first(searchParams.product)),
    category: readCategory(first(searchParams.category)),
    process: readProcess(first(searchParams.process)),
    smallMoq: first(searchParams.smallMoq) === "1",
    moqDisclosed: first(searchParams.moq) === "disclosed",
    packaging: readPackaging(first(searchParams.packaging)),
    certification: readCertification(first(searchParams.certification)),
    state: readState(first(searchParams.state)),
  };
}

export function queryToSearchParams(query: DirectoryQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.product) params.set("product", query.product);
  if (query.category) params.set("category", query.category);
  if (query.process) params.set("process", query.process);
  if (query.smallMoq) params.set("smallMoq", "1");
  if (query.moqDisclosed) params.set("moq", "disclosed");
  if (query.packaging) params.set("packaging", query.packaging);
  if (query.certification) params.set("certification", query.certification);
  if (query.state) params.set("state", query.state);
  return params;
}

function readCategory(value: string | undefined) {
  return value && isProductCategorySlug(value) ? value : undefined;
}

function readPackaging(value: string | undefined): PackagingFilter | undefined {
  switch (value) {
    case "can": case "bottle": case "jar": case "pouch": case "other": return value;
    default: return undefined;
  }
}

function readCertification(value: string | undefined): CertificationFilter | undefined {
  switch (value) {
    case "organic": case "kosher": case "halal": case "gluten-free": case "non-gmo": case "sqf": return value;
    default: return undefined;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function readProduct(value: string | undefined): FinderProduct | undefined {
  switch (value) {
    case "beverage":
    case "sauce":
    case "prepared-rte":
      return value;
    case undefined:
    case "":
    case "unsure":
      return undefined;
    default: {
      return undefined;
    }
  }
}

function readProcess(value: string | undefined): FinderProcess | undefined {
  switch (value) {
    case "hpp":
    case "hot-fill":
    case "retort":
      return value;
    case undefined:
    case "":
    case "unsure":
      return undefined;
    default: {
      return undefined;
    }
  }
}

function readState(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const code = value.toUpperCase();
  return code in STATE_NAMES ? code : undefined;
}
