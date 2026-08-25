import "./assert";
import { STATE_NAMES } from "./labels";
import { DIRECTORY_PLANTS } from "./plants";
import { PRODUCT_CATEGORIES, isProductCategorySlug, plantMatchesCategory } from "./categories";
import type {
  CertificationFilter,
  DirectoryQuery,
  DirectorySort,
  FinderProcess,
  FinderProduct,
  FutureSliceKeys,
  GuideId,
  PackagingFilter,
  Plant,
  OperationType,
} from "./types";
import { hasPackagingFormat } from "./packaging";

export const DIRECTORY_PAGE_SIZE = 18;

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
  return DIRECTORY_PLANTS;
}

export function getDirectoryPlants(): Plant[] {
  return DIRECTORY_PLANTS;
}

export function getPlantBySlug(slug: string): Plant | undefined {
  return DIRECTORY_PLANTS.find((plant) => plant.slug === slug);
}

export function getPlantSlugs(): string[] {
  return DIRECTORY_PLANTS.map((plant) => plant.slug);
}

export function isPlantIndexable(plant: Plant): boolean {
  return !plant.needsCurrentOwnershipVerification;
}

export function getIndexableProductCategories() {
  return PRODUCT_CATEGORIES.filter((category) => (
    DIRECTORY_PLANTS.some((plant) => isPlantIndexable(plant) && plantMatchesCategory(plant, category.slug))
  ));
}

export function plantsForGuide(guide: GuideId): Plant[] {
  return DIRECTORY_PLANTS.filter((plant) => plant.appearedOn.includes(guide));
}

export function filterPlants(query: DirectoryQuery): Plant[] {
  const direction = query.sort === "za" ? -1 : 1;
  return DIRECTORY_PLANTS.filter((plant) => matchesQuery(plant, query)).sort((left, right) => (
    left.name.localeCompare(right.name) * direction || left.slug.localeCompare(right.slug) * direction
  ));
}

export function paginatePlants(plants: Plant[], page: number, pageSize = DIRECTORY_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(plants.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    plants: plants.slice(startIndex, startIndex + pageSize),
    currentPage,
    pageCount,
    startIndex,
    totalCount: plants.length,
  };
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
  if (query.operationType && plant.operationType !== query.operationType) {
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
  return hasPackagingFormat(plant.packaging, packaging);
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
  return DIRECTORY_PLANTS.filter((plant) => plant.finderProducts.includes(product)).length;
}

export function verifiedStates(): string[] {
  const states = new Set<string>();
  for (const plant of DIRECTORY_PLANTS) {
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
 * Count listed manufacturers for a future programmatic slice.
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
  options: { allowSort?: boolean } = {},
): DirectoryQuery {
  return {
    product: readProduct(first(searchParams.product)),
    category: readCategory(first(searchParams.category)),
    process: readProcess(first(searchParams.process)),
    smallMoq: first(searchParams.smallMoq) === "1",
    moqDisclosed: first(searchParams.moq) === "disclosed",
    packaging: readPackaging(first(searchParams.packaging)),
    certification: readCertification(first(searchParams.certification)),
    operationType: readOperationType(first(searchParams.operationType)),
    state: readState(first(searchParams.state)),
    sort: options.allowSort ? readSort(first(searchParams.sort)) : undefined,
    page: readPage(first(searchParams.page)),
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
  if (query.operationType) params.set("operationType", query.operationType);
  if (query.state) params.set("state", query.state);
  if (query.sort === "za") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params;
}

function readPage(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 1 ? page : undefined;
}

function readSort(value: string | undefined): DirectorySort | undefined {
  return value === "za" ? value : undefined;
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

function readOperationType(value: string | undefined): OperationType | undefined {
  switch (value) {
    case "co-packer": case "co-manufacturer": case "contract-manufacturer": case "contract-packager":
    case "private-label-producer": case "toll-processor": case "shared-kitchen-incubator":
    case "brand-with-co-pack": case "other": return value;
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
    case "cold-fill":
    case "acidified":
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
