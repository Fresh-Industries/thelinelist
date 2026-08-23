"use client";

import { trackFilter } from "@/lib/analytics/client";
import {
  PROCESS_OPTIONS,
  PRODUCT_CATEGORIES,
  getProductCategory,
  productLabel,
  queryToSearchParams,
  stateLabel,
  type CertificationFilter,
  type DirectoryQuery,
  type FinderProcess,
  type PackagingFilter,
  type ProductCategorySlug,
} from "@/lib/directory";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useState, useTransition } from "react";

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
    initial.moqDisclosed || initial.smallMoq
      ? {
          key: "moq",
          label: "Minimum listed",
          href: directoryHref({ ...initial, moqDisclosed: false, smallMoq: false }),
        }
      : null,
  ].filter((filter): filter is ActiveFilter => filter !== null);
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
    initial.process || initial.packaging || initial.certification || initial.moqDisclosed || initial.smallMoq,
  );
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedFilters);
  const [category, setCategory] = useState(initial.category ?? "");
  const [process, setProcess] = useState(initial.process ?? "");
  const [packaging, setPackaging] = useState(initial.packaging ?? "");
  const [certification, setCertification] = useState(initial.certification ?? "");
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
      state: state || undefined,
      moqDisclosed,
    };
    trackFilter({
      category: category || "any",
      process: process || "any",
      packaging: packaging || "any",
      certification: certification || "any",
      state: state || "any",
      moqDisclosed,
    });
    startTransition(() => router.push(directoryHref(query)));
  }

  return (
    <>
      <form className="directory-search" onSubmit={onSubmit} aria-label="Search and filter manufacturers">
        <div className="directory-search-primary">
          <div className="field">
            <label htmlFor={`${id}-category`}>What are you making?</label>
            <select id={`${id}-category`} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Any food or drink product</option>
              {PRODUCT_CATEGORIES.map((option) => (
                <option key={option.slug} value={option.slug}>{option.label}</option>
              ))}
            </select>
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
            <span>More filters</span>
            <small>Process, packaging, minimums, and certifications</small>
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
                  {Object.entries(PACKAGING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${id}-certification`}>Certification</label>
                <select id={`${id}-certification`} value={certification} onChange={(event) => setCertification(event.target.value)}>
                  <option value="">Any certification</option>
                  {Object.entries(CERTIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
    </>
  );
}

export function DirectoryResultsBar({ initial, resultCount }: { initial: DirectoryQuery; resultCount: number }) {
  const activeFilters = getActiveFilters(initial);
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
        ) : <p>Browse every manufacturer with a verified public profile.</p>}
      </div>
      <span className="directory-sort">Sorted A–Z</span>
    </section>
  );
}
