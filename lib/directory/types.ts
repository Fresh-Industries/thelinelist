/**
 * Verified-directory types.
 *
 * This is the public product surface. A later database can implement the same
 * shapes without changing pages. Do not load `data/copackers.csv` into these
 * types — that file is a public-list lead sheet, not plant-site-verified.
 *
 * Programmatic SEO (`/copackers/texas`, `/copackers/texas/beverages`) should
 * only be added when a slice has enough verified plants. The fields below
 * (`sites.state`, `finderProducts`) are the slice keys.
 */

export const LAST_VERIFIED = "2026-08-21" as const;

export type GuideId = "hpp" | "hot-fill" | "retort" | "small-moq" | "sauce";

export type FinderProcess = "hpp" | "hot-fill" | "retort";
export type FinderProduct = "beverage" | "sauce" | "prepared-rte";

export type ProcessCapability =
  | "hpp"
  | "hot-fill"
  | "retort"
  | "cold-fill"
  | "kettle"
  | "pack-out"
  | "acidified"
  | "htst"
  | "aseptic";

export interface SourceLink {
  label: string;
  href: string;
}

export interface PlantSite {
  city: string | null;
  state: string;
  note?: string;
}

export interface GuideRow {
  location: string;
  formats?: string;
  processAsStated?: string;
  model?: string;
  certs: string;
  moq: string;
  usdaVsFda?: string;
  organic?: string;
  siteLinks: SourceLink[];
}

export interface Plant {
  slug: string;
  name: string;
  sites: PlantSite[];
  locationDisplay: string;
  processes: ProcessCapability[];
  finderProcesses: FinderProcess[];
  finderProducts: FinderProduct[];
  packaging: string | null;
  productTypesPublished: string | null;
  moqDisplay: string | null;
  publishedSmallMoq: boolean;
  certs: string[];
  lastVerified: typeof LAST_VERIFIED;
  website: SourceLink;
  extraLinks?: SourceLink[];
  overview: string[];
  notes?: string[];
  appearedOn: GuideId[];
  guideRows: Partial<Record<GuideId, GuideRow>>;
}

export interface DirectoryQuery {
  product?: FinderProduct;
  process?: FinderProcess;
  smallMoq?: boolean;
  state?: string;
}

export interface FutureSliceKeys {
  state: string;
  product?: FinderProduct;
  process?: FinderProcess;
}
