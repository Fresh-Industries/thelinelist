import "./assert";
import { STATE_NAMES } from "./labels";
import { VERIFIED_PLANTS } from "./plants";
import type {
  DirectoryQuery,
  FinderProcess,
  FinderProduct,
  FutureSliceKeys,
  GuideId,
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
  if (query.product && !plant.finderProducts.includes(query.product)) {
    return false;
  }
  if (query.process && !plant.finderProcesses.includes(query.process)) {
    return false;
  }
  if (query.smallMoq && !plant.publishedSmallMoq) {
    return false;
  }
  if (query.state && !plant.sites.some((site) => site.state === query.state)) {
    return false;
  }
  return true;
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
    process: readProcess(first(searchParams.process)),
    smallMoq: first(searchParams.smallMoq) === "1",
    state: readState(first(searchParams.state)),
  };
}

export function queryToSearchParams(query: DirectoryQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.product) params.set("product", query.product);
  if (query.process) params.set("process", query.process);
  if (query.smallMoq) params.set("smallMoq", "1");
  if (query.state) params.set("state", query.state);
  return params;
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
