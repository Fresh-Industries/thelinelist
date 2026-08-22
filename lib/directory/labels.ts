import type { FinderProcess, FinderProduct, ProcessCapability } from "./types";

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
  { value: "", label: "Not sure", hint: "We’ll show every verified plant that matches the other filters." },
  { value: "hpp", label: "HPP", hint: "HPP = stays cold; not shelf-stable." },
  { value: "hot-fill", label: "Hot fill", hint: "Hot fill = high-acid ambient (juice, tea, many sauces)." },
  { value: "retort", label: "Retort", hint: "Retort = shelf-stable meals, broths, low-acid pouches and cans." },
];

export const PROCESS_HINTS: Record<FinderProcess, string> = {
  hpp: "stays cold",
  "hot-fill": "high-acid ambient",
  retort: "shelf-stable meals",
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
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  IL: "Illinois",
  IN: "Indiana",
  KY: "Kentucky",
  LA: "Louisiana",
  MD: "Maryland",
  MO: "Missouri",
  NE: "Nebraska",
  NJ: "New Jersey",
  NM: "New Mexico",
  OH: "Ohio",
  OR: "Oregon",
  PA: "Pennsylvania",
  SC: "South Carolina",
  TX: "Texas",
  UT: "Utah",
  WI: "Wisconsin",
};

export function stateLabel(code: string): string {
  return STATE_NAMES[code] ?? code;
}
