"use client";

import { trackFilter } from "@/lib/analytics/client";
import {
  PROCESS_OPTIONS,
  PRODUCT_CATEGORIES,
  OPERATION_TYPE_LABELS,
  getProductCategory,
  productLabel,
  queryToSearchParams,
  stateLabel,
  type CertificationFilter,
  type DirectoryFacetCounts,
  type DirectoryQuery,
  type DirectorySort,
  type FinderProcess,
  type OperationType,
  type PackagingFilter,
  type ProductCategorySlug,
  type VerificationDateFilter,
} from "@/lib/directory";
import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

const PACKAGING_LABELS: Record<PackagingFilter, string> = {
  can: "Cans",
  bottle: "Bottles",
  jar: "Jars",
  pouch: "Pouches or sachets",
  other: "Other listed formats",
};

const CERTIFICATION_LABELS: Record<CertificationFilter, string> = {
  organic: "Organic",
  kosher: "Kosher",
  halal: "Halal",
  "gluten-free": "Gluten-free",
  "non-gmo": "Non-GMO",
  sqf: "SQF",
};

const CATEGORY_SEARCH_ALIASES: Partial<Record<ProductCategorySlug, string>> = {
  "sports-hydration": "energy electrolyte sports drink sports beverage",
  "functional-beverages": "energy functional beverage wellness benefit shot",
  salsa: "sauce tomato dip",
  "dressings-marinades": "sauce condiment vinaigrette",
  "dips-hummus": "spread refrigerated dip",
  "prepared-refrigerated-foods": "ready to eat meal soup salad side",
  "rtd-coffee-tea": "ready to drink cold brew",
};

const PRODUCT_COMBOBOX_OPTIONS = [
  {
    value: "" as const,
    label: "Any food or drink product",
    description: "Browse every listed manufacturer",
    searchText: "any all food drink product",
  },
  ...PRODUCT_CATEGORIES.map((category) => ({
    value: category.slug,
    label: category.label,
    description: category.description,
    searchText: `${category.label} ${category.slug} ${category.description} ${CATEGORY_SEARCH_ALIASES[category.slug] ?? ""}`.toLowerCase(),
  })),
];

const QUICK_CATEGORY_SLUGS = ["energy-drink", "sauce", "snacks", "bakery", "supplements"] as const satisfies readonly ProductCategorySlug[];
const QUICK_CATEGORIES = QUICK_CATEGORY_SLUGS.map((slug) => {
  const category = getProductCategory(slug);
  if (!category) throw new Error(`Missing quick directory category: ${slug}`);
  return category;
});

function manufacturerCountLabel(count: number): string {
  return `${count} ${count === 1 ? "manufacturer" : "manufacturers"}`;
}

function directoryHref(query: DirectoryQuery): string {
  const params = queryToSearchParams(query);
  return params.size > 0 ? `/find-manufacturers?${params}` : "/find-manufacturers";
}

type ActiveFilter = { key: string; label: string; href: string };

function getActiveFilters(initial: DirectoryQuery): ActiveFilter[] {
  return [
    initial.category
      ? {
          key: "category",
          label: getProductCategory(initial.category)?.label ?? initial.category,
          href: directoryHref({ ...initial, category: undefined, page: undefined }),
        }
      : null,
    initial.product
      ? {
          key: "product",
          label: productLabel(initial.product),
          href: directoryHref({ ...initial, product: undefined, page: undefined }),
        }
      : null,
    initial.state
      ? {
          key: "state",
          label: stateLabel(initial.state),
          href: directoryHref({ ...initial, state: undefined, page: undefined }),
        }
      : null,
    initial.process
      ? {
          key: "process",
          label: PROCESS_OPTIONS.find((option) => option.value === initial.process)?.label ?? initial.process,
          href: directoryHref({ ...initial, process: undefined, page: undefined }),
        }
      : null,
    initial.packaging
      ? {
          key: "packaging",
          label: PACKAGING_LABELS[initial.packaging],
          href: directoryHref({ ...initial, packaging: undefined, page: undefined }),
        }
      : null,
    initial.certification
      ? {
          key: "certification",
          label: CERTIFICATION_LABELS[initial.certification],
          href: directoryHref({ ...initial, certification: undefined, page: undefined }),
        }
      : null,
    initial.operationType
      ? {
          key: "operationType",
          label: OPERATION_TYPE_LABELS[initial.operationType],
          href: directoryHref({ ...initial, operationType: undefined, page: undefined }),
        }
      : null,
    initial.moqDisclosed
      ? {
          key: "moq",
          label: "Minimum listed",
          href: directoryHref({ ...initial, moqDisclosed: false, page: undefined }),
        }
      : null,
    initial.smallRunSignal || initial.smallMoq
      ? {
          key: "smallRun",
          label: "Small-run signal listed",
          href: directoryHref({ ...initial, smallRunSignal: false, smallMoq: false, page: undefined }),
        }
      : null,
    initial.verified
      ? {
          key: "verified",
          label: initial.verified === "30-days" ? "Reviewed in latest 30 days" : initial.verified === "90-days" ? "Reviewed in latest 90 days" : "Reviewed in latest year",
          href: directoryHref({ ...initial, verified: undefined, page: undefined }),
        }
      : null,
  ].filter((filter): filter is ActiveFilter => filter !== null);
}

function ProductCombobox({
  id,
  value,
  onChange,
  facetCounts,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  facetCounts: DirectoryFacetCounts["categories"];
}) {
  const listboxId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = value ? getProductCategory(value) : undefined;
  const [inputValue, setInputValue] = useState(selected?.label ?? "");
  const [isTyping, setIsTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!isTyping || !query) return PRODUCT_COMBOBOX_OPTIONS;
    return PRODUCT_COMBOBOX_OPTIONS.filter((option) => option.searchText.includes(query));
  }, [inputValue, isTyping]);

  function optionIsAvailable(option: (typeof PRODUCT_COMBOBOX_OPTIONS)[number]): boolean {
    return !option.value || facetCounts[option.value] > 0 || value === option.value;
  }

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, options]);

  function commitTypedValue() {
    if (!isTyping) return;

    const query = inputValue.trim().toLowerCase();
    const exactMatch = PRODUCT_COMBOBOX_OPTIONS.find((option) => option.label.toLowerCase() === query);
    if (exactMatch) {
      onChange(exactMatch.value);
      setInputValue(exactMatch.value ? exactMatch.label : "");
    } else {
      setInputValue(selected?.label ?? "");
    }
    setIsTyping(false);
  }

  function openOptions() {
    const selectedIndex = PRODUCT_COMBOBOX_OPTIONS.findIndex((option) => option.value === value);
    setIsTyping(false);
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function chooseOption(option: (typeof PRODUCT_COMBOBOX_OPTIONS)[number]) {
    onChange(option.value);
    setInputValue(option.value ? option.label : "");
    setIsTyping(false);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openOptions();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (options.length === 0) return 0;
        let next = current;
        for (let offset = 0; offset < options.length; offset += 1) {
          next = (next + direction + options.length) % options.length;
          if (optionIsAvailable(options[next])) return next;
        }
        return current;
      });
      return;
    }
    if (event.key === "Enter" && open) {
      const query = inputValue.trim().toLowerCase();
      const exactMatch = isTyping
        ? PRODUCT_COMBOBOX_OPTIONS.find((option) => option.label.toLowerCase() === query)
        : undefined;
      const option = exactMatch ?? options[activeIndex];
      event.preventDefault();
      if (option && optionIsAvailable(option)) {
        chooseOption(option);
      } else {
        commitTypedValue();
        setOpen(false);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setInputValue(selected?.label ?? "");
      setIsTyping(false);
      setOpen(false);
      return;
    }
    if (event.key === "Tab") setOpen(false);
  }

  return (
    <div className="product-combobox" ref={rootRef}>
      <div className="product-combobox-input">
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && options[activeIndex] ? `${listboxId}-${options[activeIndex].value || "any"}` : undefined}
          autoComplete="off"
          placeholder="Search food or drink products"
          value={inputValue}
          onFocus={openOptions}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsTyping(true);
            setActiveIndex(0);
            setOpen(true);
          }}
          onBlur={commitTypedValue}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          aria-label={open ? "Close product options" : "Browse product options"}
          aria-expanded={open}
          aria-controls={listboxId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) {
              commitTypedValue();
              setOpen(false);
            } else {
              openOptions();
              inputRef.current?.focus();
            }
          }}
        >
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
      {open ? (
        <div className="product-combobox-menu">
          <div id={listboxId} role="listbox" aria-label="Product categories">
            {options.map((option, index) => (
              <button
                id={`${listboxId}-${option.value || "any"}`}
                key={option.value || "any"}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                tabIndex={-1}
                disabled={Boolean(option.value && facetCounts[option.value] === 0 && value !== option.value)}
                aria-selected={value === option.value}
                className={index === activeIndex ? "active" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => { if (optionIsAvailable(option)) setActiveIndex(index); }}
                onClick={() => { if (optionIsAvailable(option)) chooseOption(option); }}
              >
                <span>
                  <strong>{option.label}</strong>
                  <small>
                    {option.description}
                    {option.value ? ` · ${manufacturerCountLabel(facetCounts[option.value])}` : ""}
                  </small>
                </span>
                {value === option.value ? <span className="product-option-check" aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
          {options.length === 0 ? <p role="status">No product categories match “{inputValue}”.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function DirectoryFilters({
  states,
  initial,
  facetCounts,
}: {
  states: string[];
  initial: DirectoryQuery;
  facetCounts: DirectoryFacetCounts;
}) {
  const id = useId();
  const [isPending, startTransition] = useTransition();
  const hasAdvancedFilters = Boolean(
    initial.process || initial.packaging || initial.certification || initial.operationType || initial.moqDisclosed || initial.smallRunSignal || initial.smallMoq || initial.verified,
  );
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedFilters);
  const [category, setCategory] = useState(initial.category ?? "");
  const [process, setProcess] = useState(initial.process ?? "");
  const [packaging, setPackaging] = useState(initial.packaging ?? "");
  const [certification, setCertification] = useState(initial.certification ?? "");
  const [operationType, setOperationType] = useState(initial.operationType ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [moqDisclosed, setMoqDisclosed] = useState(Boolean(initial.moqDisclosed));
  const [smallRunSignal, setSmallRunSignal] = useState(Boolean(initial.smallRunSignal || initial.smallMoq));
  const [verified, setVerified] = useState(initial.verified ?? "");

  const activeFilters = getActiveFilters(initial);
  const productInputId = `${id}-category`;
  const showVerificationFilter = Boolean(verified) || Object.values(facetCounts.verified).some((count) => count !== facetCounts.verifiedAny);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query: DirectoryQuery = {
      product: category ? undefined : initial.product,
      category: (category as ProductCategorySlug) || undefined,
      process: (process as FinderProcess) || undefined,
      packaging: (packaging as PackagingFilter) || undefined,
      certification: (certification as CertificationFilter) || undefined,
      operationType: (operationType as OperationType) || undefined,
      state: state || undefined,
      moqDisclosed,
      smallRunSignal,
      verified: (verified as VerificationDateFilter) || undefined,
      sort: initial.sort,
    };
    trackFilter({
      category: category || "any",
      process: process || "any",
      packaging: packaging || "any",
      certification: certification || "any",
      operationType: operationType || "any",
      state: state || "any",
      moqDisclosed,
      smallRunSignal,
      verified: verified || "any",
    });
    startTransition(() => window.location.assign(directoryHref(query)));
  }

  return (
    <form className="directory-search" onSubmit={onSubmit} aria-label="Search and filter manufacturers">
      <div className="directory-search-primary">
        <div className="field">
          <label htmlFor={productInputId}>What are you making?</label>
          <ProductCombobox id={productInputId} value={category} onChange={setCategory} facetCounts={facetCounts.categories} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-state`}>Where?</label>
          <select id={`${id}-state`} value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Anywhere in the U.S.</option>
            {states.map((code) => (
              <option key={code} value={code} disabled={facetCounts.states[code] === 0 && state !== code}>
                {stateLabel(code)} ({facetCounts.states[code] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-gold directory-search-submit" type="submit" disabled={isPending}>
          {isPending ? "Searching…" : <>Search <span aria-hidden="true">→</span></>}
        </button>
      </div>

      <div className="directory-quick-row">
        <span>Quick picks:</span>
        <ul aria-label="Quick product filters">
          {QUICK_CATEGORIES.map((quickCategory) => (
            <li key={quickCategory.slug}>
              <a
                href={directoryHref({ ...initial, product: undefined, category: quickCategory.slug, page: undefined })}
                aria-current={initial.category === quickCategory.slug ? "page" : undefined}
              >
                {quickCategory.label} ({facetCounts.categories[quickCategory.slug]})
              </a>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => document.getElementById(productInputId)?.focus()}>More +</button>
          </li>
        </ul>
        <p>Not sure what you need? <Link href="/find-manufacturers/wizard">Try the 4-step matcher <span aria-hidden="true">→</span></Link></p>
      </div>

      <details className="advanced-filters" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
        <summary>
          <span className="advanced-filter-label">More filters</span>
          <small>Process, packaging, minimums, certifications, and operating model</small>
        </summary>
        <div className="advanced-filter-panel">
          <div className="advanced-filter-grid">
            <div className="field">
              <label htmlFor={`${id}-process`}>How it is made <span>Process</span></label>
              <select id={`${id}-process`} value={process} onChange={(event) => setProcess(event.target.value)}>
                {PROCESS_OPTIONS.map((option) => (
                  <option
                    key={option.label}
                    value={option.value}
                    disabled={Boolean(option.value && facetCounts.processes[option.value] === 0 && process !== option.value)}
                  >
                    {option.value ? `${option.label} (${facetCounts.processes[option.value]})` : "Any process"}
                  </option>
                ))}
              </select>
              <small>Choose this only if you already know the process your product needs.</small>
            </div>
            <div className="field">
              <label htmlFor={`${id}-packaging`}>Package type</label>
              <select id={`${id}-packaging`} value={packaging} onChange={(event) => setPackaging(event.target.value)}>
                <option value="">Any packaging</option>
                {Object.entries(PACKAGING_LABELS).map(([optionValue, label]) => (
                  <option
                    key={optionValue}
                    value={optionValue}
                    disabled={facetCounts.packaging[optionValue as PackagingFilter] === 0 && packaging !== optionValue}
                  >
                    {label} ({facetCounts.packaging[optionValue as PackagingFilter]})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${id}-certification`}>Certification</label>
              <select id={`${id}-certification`} value={certification} onChange={(event) => setCertification(event.target.value)}>
                <option value="">Any certification</option>
                {Object.entries(CERTIFICATION_LABELS).map(([optionValue, label]) => (
                  <option
                    key={optionValue}
                    value={optionValue}
                    disabled={facetCounts.certifications[optionValue as CertificationFilter] === 0 && certification !== optionValue}
                  >
                    {label} ({facetCounts.certifications[optionValue as CertificationFilter]})
                  </option>
                ))}
              </select>
              <small>Only manufacturers that publicly name the selected certification are included.</small>
            </div>
            <div className="field">
              <label htmlFor={`${id}-moq`}>Minimum order</label>
              <select id={`${id}-moq`} value={moqDisclosed ? "disclosed" : ""} onChange={(event) => setMoqDisclosed(event.target.value === "disclosed")}>
                <option value="">Any minimum</option>
                <option value="disclosed" disabled={facetCounts.moqDisclosed === 0 && !moqDisclosed}>
                  Show publicly listed minimums only ({facetCounts.moqDisclosed})
                </option>
              </select>
            </div>
            <div className="field">
              <label className="field-check" htmlFor={`${id}-small-run`}>
                <input
                  id={`${id}-small-run`}
                  type="checkbox"
                  checked={smallRunSignal}
                  disabled={facetCounts.smallRunSignal === 0 && !smallRunSignal}
                  onChange={(event) => setSmallRunSignal(event.target.checked)}
                />
                Publicly lists a small-run signal ({facetCounts.smallRunSignal})
              </label>
              <small>Based only on a sourced MOQ, first-run, test-run, pilot-run, or small-run statement. Confirm current minimums directly.</small>
            </div>
            <div className="field">
              <label htmlFor={`${id}-operation-type`}>Operating model</label>
              <select id={`${id}-operation-type`} value={operationType} onChange={(event) => setOperationType(event.target.value as OperationType | "")}>
                <option value="">Any operating model</option>
                {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                    disabled={facetCounts.operationTypes[value as OperationType] === 0 && operationType !== value}
                  >
                    {label} ({facetCounts.operationTypes[value as OperationType]})
                  </option>
                ))}
              </select>
              <small>Uses the operating model stated in the public source record.</small>
            </div>
            {showVerificationFilter ? (
              <div className="field">
                <label htmlFor={`${id}-verified`}>Last verified</label>
                <select id={`${id}-verified`} value={verified} onChange={(event) => setVerified(event.target.value)}>
                  <option value="">Any review date</option>
                  <option value="30-days" disabled={facetCounts.verified["30-days"] === 0 && verified !== "30-days"}>Within 30 days of the latest catalog review ({facetCounts.verified["30-days"]})</option>
                  <option value="90-days" disabled={facetCounts.verified["90-days"] === 0 && verified !== "90-days"}>Within 90 days of the latest catalog review ({facetCounts.verified["90-days"]})</option>
                  <option value="year" disabled={facetCounts.verified.year === 0 && verified !== "year"}>Within one year of the latest catalog review ({facetCounts.verified.year})</option>
                </select>
                <small>Uses each profile’s public-source review date.</small>
              </div>
            ) : null}
          </div>
          <div className="advanced-filter-actions">
            <p>Counts reflect the filters currently applied. Unknown information is never treated as a match.</p>
            <div>
              {activeFilters.length > 0 ? <Link href="/find-manufacturers">Clear all</Link> : null}
              <button className="btn btn-gold" type="submit" disabled={isPending}>Apply filters</button>
            </div>
          </div>
        </div>
      </details>
    </form>
  );
}

export function DirectoryResultsBar({ initial, resultCount, currentPage, pageSize, startIndex }: {
  initial: DirectoryQuery;
  resultCount: number;
  currentPage: number;
  pageSize: number;
  startIndex: number;
}) {
  const [isPending, startTransition] = useTransition();
  const activeFilters = getActiveFilters(initial);

  function changeSort(sort: DirectorySort) {
    startTransition(() => window.location.assign(directoryHref({ ...initial, sort: sort === "za" ? sort : undefined, page: undefined })));
  }

  return (
    <section className="directory-results-bar" aria-labelledby="directory-results-heading">
      <div>
        <h2 id="directory-results-heading">
          {resultCount === 0
            ? "No manufacturers"
            : resultCount === 1
              ? "1 manufacturer"
              : `${startIndex + 1}–${startIndex + pageSize} of ${resultCount} manufacturers`}
        </h2>
        {currentPage > 1 ? <p className="directory-page-label">Page {currentPage}</p> : null}
        {activeFilters.length > 0 ? (
          <ul className="active-filter-list" aria-label="Active filters">
            {activeFilters.map((filter) => (
              <li key={filter.key}><a href={filter.href} aria-label={`Remove ${filter.label} filter`}>{filter.label} <span aria-hidden="true">×</span></a></li>
            ))}
          </ul>
        ) : null}
      </div>
      <label className="directory-sort">
        <span>Sort:</span>
        <select
          aria-label="Sort manufacturers"
          value={initial.sort ?? "az"}
          disabled={isPending}
          onChange={(event) => changeSort(event.target.value as DirectorySort)}
        >
          <option value="az">A–Z</option>
          <option value="za">Z–A</option>
        </select>
      </label>
    </section>
  );
}
