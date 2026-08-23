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
  type DirectoryQuery,
  type DirectorySort,
  type FinderProcess,
  type OperationType,
  type PackagingFilter,
  type ProductCategorySlug,
} from "@/lib/directory";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
          href: directoryHref({ ...initial, category: undefined }),
        }
      : null,
    initial.product
      ? {
          key: "product",
          label: productLabel(initial.product),
          href: directoryHref({ ...initial, product: undefined }),
        }
      : null,
    initial.state
      ? {
          key: "state",
          label: stateLabel(initial.state),
          href: directoryHref({ ...initial, state: undefined }),
        }
      : null,
    initial.process
      ? {
          key: "process",
          label: PROCESS_OPTIONS.find((option) => option.value === initial.process)?.label ?? initial.process,
          href: directoryHref({ ...initial, process: undefined }),
        }
      : null,
    initial.packaging
      ? {
          key: "packaging",
          label: PACKAGING_LABELS[initial.packaging],
          href: directoryHref({ ...initial, packaging: undefined }),
        }
      : null,
    initial.certification
      ? {
          key: "certification",
          label: CERTIFICATION_LABELS[initial.certification],
          href: directoryHref({ ...initial, certification: undefined }),
        }
      : null,
    initial.operationType
      ? {
          key: "operationType",
          label: OPERATION_TYPE_LABELS[initial.operationType],
          href: directoryHref({ ...initial, operationType: undefined }),
        }
      : null,
    initial.moqDisclosed || initial.smallMoq
      ? {
          key: "moq",
          label: "Minimum listed",
          href: directoryHref({ ...initial, moqDisclosed: false, smallMoq: false }),
        }
      : null,
  ].filter((filter): filter is ActiveFilter => filter !== null);
}

function ProductCombobox({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
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
        return (current + direction + options.length) % options.length;
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
      if (option) {
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
          placeholder="Search products..."
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
                aria-selected={value === option.value}
                className={index === activeIndex ? "active" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
              >
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
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
}: {
  states: string[];
  initial: DirectoryQuery;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasAdvancedFilters = Boolean(
    initial.process || initial.packaging || initial.certification || initial.operationType || initial.moqDisclosed || initial.smallMoq,
  );
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedFilters);
  const [category, setCategory] = useState(initial.category ?? "");
  const [process, setProcess] = useState(initial.process ?? "");
  const [packaging, setPackaging] = useState(initial.packaging ?? "");
  const [certification, setCertification] = useState(initial.certification ?? "");
  const [operationType, setOperationType] = useState(initial.operationType ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [moqDisclosed, setMoqDisclosed] = useState(Boolean(initial.moqDisclosed || initial.smallMoq));

  const activeFilters = getActiveFilters(initial);

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
    });
    startTransition(() => router.push(directoryHref(query)));
  }

  return (
    <form className="directory-search" onSubmit={onSubmit} aria-label="Search and filter manufacturers">
      <div className="directory-search-primary">
        <div className="field">
          <label htmlFor={`${id}-category`}>What are you making?</label>
          <ProductCombobox id={`${id}-category`} value={category} onChange={setCategory} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-state`}>Where?</label>
          <select id={`${id}-state`} value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Anywhere in the U.S.</option>
            {states.map((code) => <option key={code} value={code}>{stateLabel(code)}</option>)}
          </select>
        </div>
        <button className="btn btn-gold directory-search-submit" type="submit" disabled={isPending}>
          {isPending ? "Updating…" : <>Show manufacturers <span aria-hidden="true">→</span></>}
        </button>
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
                {PROCESS_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.value ? option.label : "Any process"}</option>)}
              </select>
              <small>Choose this only if you already know the process your product needs.</small>
            </div>
            <div className="field">
              <label htmlFor={`${id}-packaging`}>Package type</label>
              <select id={`${id}-packaging`} value={packaging} onChange={(event) => setPackaging(event.target.value)}>
                <option value="">Any packaging</option>
                {Object.entries(PACKAGING_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${id}-certification`}>Certification</label>
              <select id={`${id}-certification`} value={certification} onChange={(event) => setCertification(event.target.value)}>
                <option value="">Any certification</option>
                {Object.entries(CERTIFICATION_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
              </select>
              <small>Only manufacturers that publicly name the selected certification are included.</small>
            </div>
            <div className="field">
              <label htmlFor={`${id}-moq`}>Minimum order</label>
              <select id={`${id}-moq`} value={moqDisclosed ? "disclosed" : ""} onChange={(event) => setMoqDisclosed(event.target.value === "disclosed")}>
                <option value="">Any minimum</option>
                <option value="disclosed">Show publicly listed minimums only</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${id}-operation-type`}>Operating model</label>
              <select id={`${id}-operation-type`} value={operationType} onChange={(event) => setOperationType(event.target.value as OperationType | "")}>
                <option value="">Any operating model</option>
                {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <small>Uses the operating model stated in the public source record.</small>
            </div>
          </div>
          <div className="advanced-filter-actions">
            <p>Unknown information is never treated as a match.</p>
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

export function DirectoryResultsBar({ initial, resultCount }: { initial: DirectoryQuery; resultCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeFilters = getActiveFilters(initial);

  function changeSort(sort: DirectorySort) {
    startTransition(() => router.push(directoryHref({ ...initial, sort: sort === "za" ? sort : undefined })));
  }

  return (
    <section className="directory-results-bar" aria-labelledby="directory-results-heading">
      <div>
        <h2 id="directory-results-heading">{resultCount} {resultCount === 1 ? "manufacturer" : "manufacturers"}</h2>
        {activeFilters.length > 0 ? (
          <ul className="active-filter-list" aria-label="Active filters">
            {activeFilters.map((filter) => (
              <li key={filter.key}><Link href={filter.href} aria-label={`Remove ${filter.label} filter`}>{filter.label} <span aria-hidden="true">×</span></Link></li>
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
