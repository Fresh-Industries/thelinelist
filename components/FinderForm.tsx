"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useId, useState } from "react";
import {
  PROCESS_OPTIONS,
  PRODUCT_OPTIONS,
  queryToSearchParams,
  stateLabel,
  type DirectoryQuery,
  type FinderProcess,
  type FinderProduct,
} from "@/lib/directory";

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
  submitLabel = "Find co-packers",
  live = false,
}: {
  states: string[];
  initial?: DirectoryQuery;
  submitLabel?: string;
  live?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [product, setProduct] = useState(initial?.product ?? "");
  const [process, setProcess] = useState(initial?.process ?? "");
  const [smallMoq, setSmallMoq] = useState(initial?.smallMoq ?? false);
  const [state, setState] = useState(initial?.state ?? "");

  const selectedProcess = PROCESS_OPTIONS.find((option) => option.value === process);

  function currentQuery(): DirectoryQuery {
    return {
      product: asProduct(product),
      process: asProcess(process),
      smallMoq,
      state: state || undefined,
    };
  }

  function pushQuery(query: DirectoryQuery) {
    const params = queryToSearchParams(query);
    const next = params.toString() ? `/copackers?${params.toString()}` : "/copackers";
    router.replace(next, { scroll: false });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = queryToSearchParams(currentQuery());
    router.push(params.toString() ? `/copackers?${params.toString()}` : "/copackers");
  }

  return (
    <form className="finder" onSubmit={onSubmit} aria-label="Find a co-packer">
      <h2>What are you trying to make?</h2>
      <div className="finder-grid">
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
        <div className="field">
          <label htmlFor={`${id}-process`}>Process</label>
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
        <div className="field">
          <label htmlFor={`${id}-state`}>State</label>
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
            <option value="">Any verified state</option>
            {states.map((code) => (
              <option key={code} value={code}>
                {stateLabel(code)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="finder-extras">
        <label className="field-check">
          <input
            type="checkbox"
            name="smallMoq"
            value="1"
            checked={smallMoq}
            onChange={(event) => {
              const next = event.target.checked;
              setSmallMoq(next);
              if (live) {
                pushQuery({ ...currentQuery(), smallMoq: next });
              }
            }}
          />
          Published small MOQ only
        </label>
        <button className="btn" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
