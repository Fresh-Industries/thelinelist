"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { calculateRunCosts, COST_ITEMS, costWorksheetSchema, emptyCostWorksheet, type CostWorksheet } from "@/lib/sourcing/preparation";
import { getProductIdentity } from "@/lib/sourcing/product-identity";
import type { SourcingWorkspace } from "@/lib/sourcing/types";
import { useConnectedPlan } from "./useConnectedPlan";
import { track } from "@/lib/analytics/client";

type Draft = Record<keyof CostWorksheet, string>;
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const numericKeys = ["quantity", ...COST_ITEMS.map((item) => item.key), "sellingPrice"] as const;

function draftFromWorksheet(worksheet: CostWorksheet): Draft {
  return Object.fromEntries(Object.entries(worksheet).map(([key, value]) => [key, value === null ? "" : String(value)])) as Draft;
}

export function RunCostWorksheet() {
  const connection = useConnectedPlan();
  if (connection.loading) return <p role="status">Opening your cost worksheet…</p>;
  return <CostEditor key={connection.workspace?.id ?? "new"} {...connection} />;
}

function CostEditor({ workspace, saving, error, save }: {
  workspace: SourcingWorkspace | null; saving: boolean; error: string;
  save: (mutation: Record<string, unknown>) => Promise<boolean>;
}) {
  const storageKey = `the-line-list:cost-draft:${workspace?.id ?? "new"}`;
  const [draft, setDraft] = useState<Draft>(() => {
    const base = draftFromWorksheet(workspace?.preparation?.costWorksheet ?? emptyCostWorksheet());
    try {
      const raw = sessionStorage.getItem(storageKey) ?? (!workspace?.preparation?.costWorksheet ? sessionStorage.getItem("the-line-list:cost-draft:new") : null);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        for (const key of Object.keys(base) as (keyof Draft)[]) {
          const value = (stored as Record<string, unknown>)[key];
          if (typeof value === "string" && value.length <= 2_000) base[key] = value;
        }
      }
    } catch { /* A damaged browser draft never replaces the saved plan. */ }
    return base;
  });
  const [message, setMessage] = useState("");
  const parsed = costWorksheetSchema.safeParse({ ...draft, ...Object.fromEntries(numericKeys.map((key) => [key, draft[key].trim() === "" ? null : Number(draft[key])])) });
  const result = parsed.success ? calculateRunCosts(parsed.data) : null;
  const identity = workspace ? getProductIdentity(workspace) : null;

  function update(key: keyof Draft, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setMessage("Worksheet has unsaved changes.");
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* The visible worksheet still works. */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.success) return;
    if (await save({ preparationUpdate: { costWorksheet: parsed.data } })) {
      setMessage("Cost worksheet saved privately to your product plan.");
      track("run_cost_worksheet_saved");
      try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem("the-line-list:cost-draft:new"); } catch { /* Optional draft cleanup. */ }
    }
  }

  return <form className="run-cost-worksheet" onSubmit={submit}>
    <div className="cost-inputs">
      <fieldset>
        <legend>1. Pick the amount you want to explore</legend>
        <div className="cost-input-grid">
          <label>Finished units for this run<input type="number" inputMode="numeric" min={1} max={100_000_000} step={1} value={draft.quantity} onChange={(event) => update("quantity", event.target.value)} placeholder="Unknown" /></label>
          <label>What is one unit?<input maxLength={60} value={draft.unitLabel} onChange={(event) => update("unitLabel", event.target.value)} placeholder="For example: one bottle" required /></label>
        </div>
        <p>Use sellable finished units. Convert cases or batches only when you know their contents and expected yield.</p>
      </fieldset>
      <fieldset>
        <legend>2. Add the costs you know</legend>
        <p>All amounts are USD estimates. Blank means unknown. Enter 0 only when there is no separate cost or it is included elsewhere.</p>
        <div className="cost-input-grid">{COST_ITEMS.map((item) => <label key={item.key} htmlFor={`cost-${item.key}`}>
          <span>{item.label} <small>{item.basis === "unit" ? "USD per unit" : "USD for the whole run"}</small></span>
          <input id={`cost-${item.key}`} type="number" inputMode="decimal" min={0} max={1_000_000_000} step="any" value={draft[item.key]} onChange={(event) => update(item.key, event.target.value)} placeholder="Unknown" aria-describedby={`cost-${item.key}-hint`} />
          <small id={`cost-${item.key}-hint`}>{item.hint}</small>
        </label>)}</div>
      </fieldset>
      <details className="cost-extra">
        <summary>Compare with your selling price</summary>
        <label>Your selling price per unit, USD<input type="number" inputMode="decimal" min={0} max={1_000_000_000} step="any" value={draft.sellingPrice} onChange={(event) => update("sellingPrice", event.target.value)} placeholder="Unknown" /></label>
        <p>Use what your business receives before costs, such as your wholesale price when selling to a retailer. The shelf price is not necessarily your revenue.</p>
      </details>
      <label className="cost-notes">Quote sources and assumptions<textarea rows={3} maxLength={2_000} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Quote date, storage period, what freight covers, costs included elsewhere, or questions still open…" /></label>
    </div>
    <aside className="cost-results" aria-labelledby="cost-results-heading">
      <h3 id="cost-results-heading">Your first-run estimate</h3>
      <dl aria-live="polite" aria-atomic="true">
        <div><dt>{result?.complete ? "Estimated run cost" : "Subtotal of entered costs"}</dt><dd data-testid="run-cost-total">{result?.subtotal !== null && result?.subtotal !== undefined ? money(result.subtotal) : "Still open"}</dd></div>
        <div><dt>{result?.complete ? "Estimated cost per unit" : "Entered cost per unit"}</dt><dd data-testid="run-cost-unit">{result?.unitCost !== null && result?.unitCost !== undefined ? money(result.unitCost) : "Still open"}</dd></div>
      </dl>
      {!parsed.success ? <p role="alert">Use a positive whole number of finished units, a unit label, and nonnegative costs within the input limits.</p> : null}
      {result?.missing.length ? <p><strong>Not included yet:</strong> {result.missing.join(", ")}. This is a partial estimate.</p> : null}
      {parsed.success && !parsed.data.quantity ? <p>Add a quantity to calculate this run.</p> : null}
      {result?.amountLeft !== null && result?.amountLeft !== undefined ? <p><strong>{money(result.amountLeft)} per unit left after entered costs.</strong> This is before selling fees, marketing, overhead, taxes, and other costs you have not included. It is not net profit.</p> : null}
      <details><summary>How the estimate works</summary><p>Per-unit costs × finished units + whole-run costs. Divide by finished units for the unit cost. Whole-run costs stay at the amounts you entered when quantity changes; update freight, storage, setup, and quoted rates for each scenario.</p></details>
      <p className="meta">This worksheet does not set the manufacturer’s minimum or your production-volume decision. Keep both explicit in your brief.</p>
    </aside>
    <div className="cost-save">
      {workspace ? <><p>Save privately to <a href={`/sourcing/${workspace.id}`}>{identity?.brandName || identity?.productDescriptor}</a>. Worksheet values stay out of manufacturer packets.</p><button className="btn btn-gold" disabled={saving || !parsed.success}>{saving ? "Saving…" : "Save cost worksheet to my plan"}</button></> : <><p>Try the worksheet without an account. Your draft stays in this tab while you create a plan.</p><Link className="btn btn-gold" href="/sourcing?guide=first-run-costs">Start a plan to save these costs <span aria-hidden="true">→</span></Link></>}
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </form>;
}
