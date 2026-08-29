import { PRODUCT_CATEGORIES, type ProductCategorySlug } from "./categories";
import { OPERATION_TYPE_LABELS, PACKAGING_LABELS, PROCESS_OPTIONS } from "./labels";
import type { FinderProcess, OperationType, PackagingFilter } from "./types";

const CATEGORY_SEARCH_ALIASES: Partial<Record<ProductCategorySlug, string>> = {
  "sports-hydration": "energy electrolyte sports drink sports beverage",
  "functional-beverages": "energy functional beverage wellness benefit shot",
  salsa: "sauce tomato dip",
  "dressings-marinades": "sauce condiment vinaigrette",
  "dips-hummus": "spread refrigerated dip",
  "prepared-refrigerated-foods": "ready to eat meal soup salad side",
  "rtd-coffee-tea": "ready to drink cold brew",
};

const COPACK_CATEGORY_FALLBACK: ProductCategorySlug[] = [
  "sauce",
  "energy-drink",
  "snacks",
  "bakery",
  "supplements",
  "juice",
];

const BOTTLING_CATEGORIES: ProductCategorySlug[] = [
  "juice",
  "rtd-coffee-tea",
  "energy-drink",
  "water",
];

export type ProductComboboxSelection =
  | { kind: "category"; value: ProductCategorySlug | "" }
  | { kind: "packaging"; value: PackagingFilter }
  | { kind: "process"; value: FinderProcess }
  | { kind: "operationType"; value: OperationType };

export interface ProductComboboxSuggestion {
  id: string;
  label: string;
  description: string;
  searchText: string;
  selection: ProductComboboxSelection;
}

export interface ProductComboboxCounts {
  categories: Partial<Record<ProductCategorySlug, number>>;
  packaging?: Partial<Record<PackagingFilter, number>>;
  processes?: Partial<Record<FinderProcess, number>>;
  operationTypes?: Partial<Record<OperationType, number>>;
}

interface SynonymGroup {
  terms: string[];
  suggestions: ProductComboboxSelection[];
  includeHighCountCategories?: boolean;
}

const SYNONYM_GROUPS: SynonymGroup[] = [
  {
    terms: ["bottling", "bottle", "bottled", "bottles"],
    suggestions: [
      { kind: "packaging", value: "bottle" },
      ...BOTTLING_CATEGORIES.map((value) => ({ kind: "category" as const, value })),
    ],
  },
  {
    terms: ["canning", "canned", "cans"],
    suggestions: [{ kind: "packaging", value: "can" }],
  },
  {
    terms: ["filling"],
    suggestions: [
      { kind: "process", value: "hot-fill" },
      { kind: "process", value: "cold-fill" },
    ],
  },
  {
    terms: ["hot fill", "hot-fill", "hotfill"],
    suggestions: [{ kind: "process", value: "hot-fill" }],
  },
  {
    terms: ["cold fill", "cold-fill", "coldfill"],
    suggestions: [{ kind: "process", value: "cold-fill" }],
  },
  {
    terms: ["co-pack", "copack", "co pack", "co packer", "copacker", "co-packer", "contract pack"],
    suggestions: [{ kind: "category", value: "" }],
    includeHighCountCategories: true,
  },
  {
    terms: ["private label", "private-label", "privatelabel"],
    suggestions: [{ kind: "operationType", value: "private-label-producer" }],
  },
];

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactSearch(value: string): string {
  return normalizeSearch(value).replace(/\s+/g, "");
}

function termMatchesQuery(term: string, query: string): boolean {
  const normalizedTerm = normalizeSearch(term);
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length < 3) return false;
  if (
    normalizedTerm === normalizedQuery
    || normalizedTerm.startsWith(normalizedQuery)
    || normalizedQuery.startsWith(normalizedTerm)
  ) {
    return true;
  }
  const compactTerm = compactSearch(term);
  const compactQuery = compactSearch(query);
  if (compactTerm.startsWith(compactQuery) || compactQuery.startsWith(compactTerm)) {
    return true;
  }
  return normalizedTerm.split(" ").every((word) => word.length > 0 && normalizedQuery.includes(word));
}

function categorySuggestion(slug: ProductCategorySlug | ""): ProductComboboxSuggestion {
  if (!slug) {
    return {
      id: "category:any",
      label: "Any food or drink product",
      description: "Browse every listed manufacturer",
      searchText: "any all food drink product",
      selection: { kind: "category", value: "" },
    };
  }
  const category = PRODUCT_CATEGORIES.find((entry) => entry.slug === slug);
  if (!category) {
    throw new Error(`Missing product category: ${slug}`);
  }
  return {
    id: `category:${category.slug}`,
    label: category.label,
    description: category.description,
    searchText: `${category.label} ${category.slug} ${category.description} ${CATEGORY_SEARCH_ALIASES[category.slug] ?? ""}`.toLowerCase(),
    selection: { kind: "category", value: category.slug },
  };
}

function packagingSuggestion(value: PackagingFilter): ProductComboboxSuggestion {
  return {
    id: `packaging:${value}`,
    label: `${PACKAGING_LABELS[value]} (packaging)`,
    description: "Package type from the public source record",
    searchText: `${PACKAGING_LABELS[value]} ${value} packaging package`.toLowerCase(),
    selection: { kind: "packaging", value },
  };
}

function processSuggestion(value: FinderProcess): ProductComboboxSuggestion {
  const option = PROCESS_OPTIONS.find((entry) => entry.value === value);
  if (!option || !option.value) {
    throw new Error(`Missing process option: ${value}`);
  }
  return {
    id: `process:${value}`,
    label: `${option.label} (process)`,
    description: option.hint,
    searchText: `${option.label} ${value} process`.toLowerCase(),
    selection: { kind: "process", value },
  };
}

function operationTypeSuggestion(value: OperationType): ProductComboboxSuggestion {
  return {
    id: `operationType:${value}`,
    label: `${OPERATION_TYPE_LABELS[value]} (operating model)`,
    description: "Operating model from the public source record",
    searchText: `${OPERATION_TYPE_LABELS[value]} ${value} operating model`.toLowerCase(),
    selection: { kind: "operationType", value },
  };
}

function suggestionFromSelection(selection: ProductComboboxSelection): ProductComboboxSuggestion {
  switch (selection.kind) {
    case "category":
      return categorySuggestion(selection.value);
    case "packaging":
      return packagingSuggestion(selection.value);
    case "process":
      return processSuggestion(selection.value);
    case "operationType":
      return operationTypeSuggestion(selection.value);
    default: {
      const exhaustive: never = selection;
      throw new Error(`Unhandled combobox selection: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function suggestionIsAvailable(suggestion: ProductComboboxSuggestion, counts?: ProductComboboxCounts): boolean {
  if (!counts) return true;
  switch (suggestion.selection.kind) {
    case "category":
      return !suggestion.selection.value || (counts.categories[suggestion.selection.value] ?? 0) > 0;
    case "packaging":
      return (counts.packaging?.[suggestion.selection.value] ?? 0) > 0;
    case "process":
      return (counts.processes?.[suggestion.selection.value] ?? 0) > 0;
    case "operationType":
      return (counts.operationTypes?.[suggestion.selection.value] ?? 0) > 0;
    default: {
      const exhaustive: never = suggestion.selection;
      throw new Error(`Unhandled combobox selection: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function highCountCategorySuggestions(counts?: ProductComboboxCounts): ProductComboboxSuggestion[] {
  const ranked = [...PRODUCT_CATEGORIES]
    .map((category) => ({ slug: category.slug, count: counts?.categories[category.slug] ?? 0 }))
    .filter((category) => !counts || category.count > 0)
    .sort((left, right) => {
      if (left.slug === "sauce") return -1;
      if (right.slug === "sauce") return 1;
      return right.count - left.count || left.slug.localeCompare(right.slug);
    });
  const slugs = (ranked.length > 0 ? ranked.map((category) => category.slug) : COPACK_CATEGORY_FALLBACK)
    .slice(0, 6);
  return slugs.map((slug) => categorySuggestion(slug));
}

function synonymSuggestions(query: string, counts?: ProductComboboxCounts): ProductComboboxSuggestion[] {
  const matched = new Map<string, ProductComboboxSuggestion>();
  for (const group of SYNONYM_GROUPS) {
    if (!group.terms.some((term) => termMatchesQuery(term, query))) continue;
    for (const selection of group.suggestions) {
      const suggestion = suggestionFromSelection(selection);
      if (suggestionIsAvailable(suggestion, counts)) {
        matched.set(suggestion.id, suggestion);
      }
    }
    if (group.includeHighCountCategories) {
      for (const suggestion of highCountCategorySuggestions(counts)) {
        if (suggestionIsAvailable(suggestion, counts)) {
          matched.set(suggestion.id, suggestion);
        }
      }
    }
  }
  return [...matched.values()];
}

function categoryTextMatches(query: string): ProductComboboxSuggestion[] {
  const normalizedQuery = query.trim().toLowerCase();
  return [
    categorySuggestion(""),
    ...PRODUCT_CATEGORIES.map((category) => categorySuggestion(category.slug)),
  ].filter((option) => option.searchText.includes(normalizedQuery));
}

export function productCategoryOptions(): ProductComboboxSuggestion[] {
  return [
    categorySuggestion(""),
    ...PRODUCT_CATEGORIES.map((category) => categorySuggestion(category.slug)),
  ];
}

export function productComboboxSuggestions(
  query: string,
  options: { isTyping?: boolean; counts?: ProductComboboxCounts } = {},
): ProductComboboxSuggestion[] {
  const trimmed = query.trim();
  if (!options.isTyping || !trimmed) return productCategoryOptions();

  const matched = new Map<string, ProductComboboxSuggestion>();
  for (const suggestion of synonymSuggestions(trimmed, options.counts)) {
    matched.set(suggestion.id, suggestion);
  }
  for (const suggestion of categoryTextMatches(trimmed)) {
    if (suggestionIsAvailable(suggestion, options.counts)) {
      matched.set(suggestion.id, suggestion);
    }
  }
  return [...matched.values()];
}

export function selectionAppliesCurrentFilters(
  suggestion: ProductComboboxSuggestion,
  current: {
    category?: string;
    packaging?: string;
    process?: string;
    operationType?: string;
  },
): boolean {
  switch (suggestion.selection.kind) {
    case "category":
      return (current.category ?? "") === suggestion.selection.value;
    case "packaging":
      return current.packaging === suggestion.selection.value;
    case "process":
      return current.process === suggestion.selection.value;
    case "operationType":
      return current.operationType === suggestion.selection.value;
    default: {
      const exhaustive: never = suggestion.selection;
      throw new Error(`Unhandled combobox selection: ${JSON.stringify(exhaustive)}`);
    }
  }
}
