/**
 * Sourced-directory types.
 *
 * This is the public product surface. A later database can implement the same
 * shapes without changing pages. Do not load `data/copackers.csv` into these
 * types — that file is a public-list lead sheet, not plant-site-verified.
 *
 * Programmatic SEO (`/copackers/texas`, `/copackers/texas/beverages`) should
 * only be added when a slice has enough sourced listings. The fields below
 * (`sites.state`, `finderProducts`) are the slice keys.
 */

export const LAST_VERIFIED = "2026-08-24" as const;

export type GuideId = "hpp" | "hot-fill" | "retort" | "small-moq" | "sauce";

export type FinderProcess = "hpp" | "hot-fill" | "retort" | "cold-fill" | "acidified";
export type FinderProduct = "beverage" | "sauce" | "prepared-rte";
export type PackagingFilter = "can" | "bottle" | "jar" | "pouch" | "other";
export type CertificationFilter = "organic" | "kosher" | "halal" | "gluten-free" | "non-gmo" | "sqf";
export type DirectorySort = "az" | "za";
export type ListingStatus = "VERIFIED" | "LISTABLE";
export type OperationType =
  | "co-packer"
  | "co-manufacturer"
  | "contract-manufacturer"
  | "contract-packager"
  | "private-label-producer"
  | "toll-processor"
  | "shared-kitchen-incubator"
  | "brand-with-co-pack"
  | "other";

export type EvidenceField = "products" | "processes" | "packaging" | "minimums" | "certifications";

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
  /** Explicit taxonomy mappings from the ingestion layer. Undefined on legacy curated records. */
  categories?: import("./categories").ProductCategorySlug[];
  packaging: string | null;
  productTypesPublished: string | null;
  manufacturingCapabilitiesPublished?: string | null;
  rawProductTags?: string[];
  rawCapabilityTags?: string[];
  moqDisplay: string | null;
  /** True when the plant’s own site printed a numeric or stated MOQ. Not the small-MOQ guide membership. */
  publishedSmallMoq: boolean;
  certs: string[];
  lastVerified: string;
  /** Legacy curated records default to VERIFIED when this is absent. */
  listingStatus?: ListingStatus;
  confidence?: number;
  website: SourceLink;
  extraLinks?: SourceLink[];
  phone?: string | null;
  publicEmail?: string | null;
  operationType?: OperationType;
  operationTypePublished?: string | null;
  /** URLs recorded as evidence for a specific published field. */
  fieldSourceUrls?: Partial<Record<EvidenceField, string[]>>;
  /** A current ownership or operating-entity change makes the profile unsuitable for indexing. */
  needsCurrentOwnershipVerification?: boolean;
  /** Contact-help submissions are blocked until the operating entity is reverified. */
  introductionsPaused?: boolean;
  verificationNotice?: string;
  flags?: string[];
  qualityNotes?: string | null;
  masterDedupeKey?: string;
  overview: string[];
  notes?: string[];
  appearedOn: GuideId[];
  guideRows: Partial<Record<GuideId, GuideRow>>;
}

export interface DirectoryQuery {
  product?: FinderProduct;
  category?: import("./categories").ProductCategorySlug;
  process?: FinderProcess;
  smallMoq?: boolean;
  moqDisclosed?: boolean;
  packaging?: PackagingFilter;
  certification?: CertificationFilter;
  operationType?: OperationType;
  state?: string;
  sort?: DirectorySort;
  page?: number;
}

export interface FutureSliceKeys {
  state: string;
  product?: FinderProduct;
  process?: FinderProcess;
}
