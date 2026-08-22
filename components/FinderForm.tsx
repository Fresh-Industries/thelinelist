"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useId, useState } from "react";
import {
  PROCESS_OPTIONS,
  PRODUCT_OPTIONS,
  interpretProductIntent,
  queryToSearchParams,
  stateLabel,
  type DirectoryQuery,
  type FinderProcess,
  type FinderProduct,
} from "@/lib/directory";

const POPULAR_SEARCHES: { label: string; href: string }[] = [
  { label: "Hot sauce", href: "/copackers?product=sauce&q=hot+sauce" },
  { label: "Beverages", href: "/copackers?product=beverage" },
  { label: "Sauces", href: "/copackers?product=sauce" },
  { label: "Prepared / RTE", href: "/copackers?product=prepared-rte" },
];

function asProduct(value: string): FinderProduct | undefined {
  switch (value) {
    case "beverage":
    case "sauce":
    case "prepared-rte":
      return value;
    case "":
      return undefined;
    default: {
      const _exhaustive: never = value as never;
      void _exhaustive;
      return undefined;
    }
  }
}

function asProcess(value: string): FinderProcess | undefined {
  switch (value) {
    case "hpp":
    case "hot-fill":
    case "retort":
      return value;
    case "":
      return undefined;
    default: {
      const _exhaustive: never = value as never;
      void _exhaustive;
      return undefined;
    }
  }
}

export function FinderForm({
  states,
  initial,
  submitLabel,
  live = false,
  variant = "directory",
  initialMaking = "",
}: {
  states: string[];
  initial?: DirectoryQuery;
  submitLabel?: string;
  live?: boolean;
  variant?: "match" | "directory";
  initialMaking?: string;
}) {
  const id = useId();
  const router = useRouter();
  const [making, setMaking] = useState(initialMaking);
  const [product, setProduct] = useState(initial?.product ?? "");
  const [process, setProcess] = useState(initial?.process ?? "");
  const [smallMoq, setSmallMoq] = useState(initial?.smallMoq ?? false);
  const [state, setState] = useState(initial?.state ?? "");
  const isMatch = variant === "match";
  const buttonLabel = submitLabel ?? (isMatch ? "Find My Match" : "Update results");

  const selectedProcess = PROCESS_OPTIONS.find((option) => option.value === process);

  function currentQuery(): DirectoryQuery {
    if (isMatch) {
      const intent = interpretProductIntent(making);
      return {
        product: intent.product,
        smallMoq,
        state: state || undefined,
      };
    }
    return {
      product: asProduct(product),
      process: asProcess(process),
      smallMoq,
      state: state || undefined,
    };
  }

  function hrefFor(query: DirectoryQuery, makingText = making) {
    const params = queryToSearchParams(query);
    const trimmed = makingText.trim();
    if (isMatch && trimmed) {
      params.set("q", trimmed);
    }
    return params.toString() ? `/copackers?${params.toString()}` : "/copackers";
  }

  function pushQuery(query: DirectoryQuery) {
    router.replace(hrefFor(query), { scroll: false });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(hrefFor(currentQuery()));
  }

  return (
    <form
      className={isMatch ? "finder finder-match" : "finder"}
      onSubmit={onSubmit}
      aria-label="Find My Match"
    >
      {isMatch ? (
        <div className="finder-copy">
          <p className="finder-kicker">Find My Match</p>
          <h2>Tell us what you want to make</h2>
          <p>Use everyday words. We map them to verified plants — you do not need to know HPP, retort, or hot fill.</p>
        </div>
      ) : (
        <h2>Find My Match</h2>
      )}
      <div className={isMatch ? "finder-grid finder-grid-match" : "finder-grid"}>
        {isMatch ? (
          <div className="field field-wide">
            <label htmlFor={`${id}-making`}>What are you making?</label>
            <input
              id={`${id}-making`}
              name="q"
              type="text"
              value={making}
              placeholder="e.g. Hot sauce, cold juice, hummus…"
              autoComplete="off"
              onChange={(event) => setMaking(event.target.value)}
            />
          </div>
        ) : (
          <div className="field">
            <label htmlFor={`${id}-product`}>What are you making?</label>
            <select
              id={`${id}-product`}
              name="product"
              value={product}
              onChange={(event) => {
                const next = event.target.value;
                setProduct(next);
                if (live) {
                  pushQuery({ ...currentQuery(), product: asProduct(next) });
                }
              }}
            >
              {PRODUCT_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {isMatch ? null : (
          <div className="field">
            <label htmlFor={`${id}-process`}>Process if you already know it</label>
            <select
              id={`${id}-process`}
              name="process"
              value={process}
              onChange={(event) => {
                const next = event.target.value;
                setProcess(next);
                if (live) {
                  pushQuery({ ...currentQuery(), process: asProcess(next) });
                }
              }}
            >
              {PROCESS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedProcess ? <p className="hint">{selectedProcess.hint}</p> : null}
          </div>
        )}
        <div className="field">
          <label htmlFor={`${id}-state`}>Where?</label>
          <select
            id={`${id}-state`}
            name="state"
            value={state}
            onChange={(event) => {
              const next = event.target.value;
              setState(next);
              if (live) {
                pushQuery({ ...currentQuery(), state: next || undefined });
              }
            }}
          >
            <option value="">Any state</option>
            {states.map((code) => (
              <option key={code} value={code}>
                {stateLabel(code)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-moq`}>MOQ?</label>
          <select
            id={`${id}-moq`}
            name="smallMoq"
            value={smallMoq ? "1" : ""}
            onChange={(event) => {
              const next = event.target.value === "1";
              setSmallMoq(next);
              if (live) {
                pushQuery({ ...currentQuery(), smallMoq: next });
              }
            }}
          >
            <option value="">Any</option>
            <option value="1">Published small MOQ only</option>
          </select>
        </div>
      </div>
      <div className="finder-extras">
        <button className="btn btn-gold" type="submit">
          {buttonLabel}
          <span aria-hidden="true"> →</span>
        </button>
      </div>
      {isMatch ? (
        <div className="popular-searches">
          <p>Popular searches</p>
          <ul>
            {POPULAR_SEARCHES.map((chip) => (
              <li key={chip.label}>
                <Link href={chip.href}>{chip.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
