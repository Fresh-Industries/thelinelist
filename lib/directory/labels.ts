import type { FinderProcess, FinderProduct, OperationType, PackagingFilter, ProcessCapability } from "./types";

export const PRODUCT_OPTIONS: { value: FinderProduct | ""; label: string }[] = [
  { value: "", label: "Not sure" },
  { value: "beverage", label: "Beverage" },
  { value: "sauce", label: "Sauce / condiment" },
  { value: "prepared-rte", label: "Prepared / refrigerated RTE" },
];

export const PROCESS_OPTIONS: {
  value: FinderProcess | "";
  label: string;
  hint: string;
}[] = [
  { value: "", label: "Not sure", hint: "We’ll show every listed manufacturer that matches the other filters." },
  { value: "hpp", label: "HPP", hint: "HPP = stays cold; not shelf-stable." },
  { value: "hot-fill", label: "Hot fill", hint: "Hot fill = high-acid ambient (juice, tea, many sauces)." },
  { value: "retort", label: "Retort", hint: "Retort = shelf-stable meals, broths, low-acid pouches and cans." },
  { value: "cold-fill", label: "Cold fill", hint: "Cold fill = filled without a hot-fill step; storage and safety controls still vary." },
  { value: "acidified", label: "Acidified", hint: "Acidified = a low-acid food adjusted to a controlled finished pH." },
];

export const PROCESS_HINTS: Record<FinderProcess, string> = {
  hpp: "stays cold",
  "hot-fill": "high-acid ambient",
  retort: "shelf-stable meals",
  "cold-fill": "filled without hot fill",
  acidified: "controlled finished acidity",
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  "co-packer": "Co-packer",
  "co-manufacturer": "Co-manufacturer",
  "contract-manufacturer": "Contract manufacturer",
  "contract-packager": "Contract packager",
  "private-label-producer": "Private-label producer",
  "toll-processor": "Toll processor",
  "shared-kitchen-incubator": "Shared kitchen or incubator",
  "brand-with-co-pack": "Brand with co-packing",
  other: "Other public operating model",
};

export const PACKAGING_LABELS: Record<PackagingFilter, string> = {
  can: "Cans",
  bottle: "Bottles",
  jar: "Jars",
  pouch: "Pouches or sachets",
  other: "Other listed formats",
};

const PROCESS_LABELS: Record<ProcessCapability, string> = {
  hpp: "HPP",
  "hot-fill": "Hot fill",
  retort: "Retort",
  "cold-fill": "Cold fill",
  kettle: "Kettle",
  "pack-out": "Pack-out",
  acidified: "Acidified",
  htst: "HTST",
  aseptic: "Aseptic",
};

const PRODUCT_LABELS: Record<FinderProduct, string> = {
  beverage: "Beverage",
  sauce: "Sauce / condiment",
  "prepared-rte": "Prepared / refrigerated RTE",
};

export function processLabel(process: ProcessCapability): string {
  return PROCESS_LABELS[process];
}

export function productLabel(product: FinderProduct): string {
  return PRODUCT_LABELS[product];
}

export function processHint(process: FinderProcess): string {
  return PROCESS_HINTS[process];
}

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export function stateLabel(code: string): string {
  return STATE_NAMES[code] ?? code;
}
