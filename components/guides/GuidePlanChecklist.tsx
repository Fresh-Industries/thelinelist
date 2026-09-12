"use client";

import Link from "next/link";
import { useState } from "react";
import { guidePlanAction } from "@/lib/guides/plan-actions";
import { checklistItemId } from "@/lib/sourcing/preparation";
import { getProductIdentity } from "@/lib/sourcing/product-identity";
import type { SourcingWorkspace } from "@/lib/sourcing/types";
import { useConnectedPlan } from "./useConnectedPlan";
import { track } from "@/lib/analytics/client";

export function GuidePlanChecklist({ slug, items }: { slug: string; items: string[] }) {
  const connection = useConnectedPlan();
  if (connection.loading) return <><ul className="checklist">{items.map((item) => <li key={item}>{item}</li>)}</ul><p role="status">Loading your saved checklist…</p></>;
  return <ChecklistEditor key={connection.workspace?.id ?? "new"} slug={slug} items={items} {...connection} />;
}

function ChecklistEditor({ slug, items, workspace, saving, error, save }: {
  slug: string; items: string[]; workspace: SourcingWorkspace | null; saving: boolean; error: string;
  save: (mutation: Record<string, unknown>) => Promise<boolean>;
}) {
  const storageKey = `the-line-list:checklist-draft:${slug}:${workspace?.id ?? "new"}`;
  const [checked, setChecked] = useState<string[]>(() => {
    const saved = workspace?.preparation?.checklists[slug];
    try {
      const draft = sessionStorage.getItem(storageKey) ?? (!saved ? sessionStorage.getItem(`the-line-list:checklist-draft:${slug}:new`) : null);
      const parsed: unknown = draft ? JSON.parse(draft) : saved ?? [];
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && items.some((item) => checklistItemId(item) === id)) : saved ?? [];
    } catch { return saved ?? []; }
  });
  const [message, setMessage] = useState("");
  const action = guidePlanAction(slug);
  const [answer, setAnswer] = useState(workspace?.fields[action.key].value ?? "");
  const identity = workspace ? getProductIdentity(workspace) : null;

  function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter((item) => item !== id) : [...checked, id];
    setChecked(next);
    setMessage("Checklist has unsaved changes.");
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* The visible draft remains usable. */ }
  }

  async function saveChecklist() {
    if (await save({ preparationUpdate: { checklist: { guideSlug: slug, completedItemIds: checked } } })) {
      setMessage("Checklist saved to your product plan.");
      track("guide_checklist_saved", { guide: slug });
      try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(`the-line-list:checklist-draft:${slug}:new`); } catch { /* Optional draft cleanup. */ }
    }
  }

  async function saveDecision(unknown = false) {
    if (await save({ fieldUpdate: { key: action.key, value: unknown ? null : answer.trim(), status: unknown ? "needs_decision" : "confirmed" } })) {
      setMessage(unknown ? "This decision is open in your product plan." : "Your answer is saved in your product plan.");
      track("guide_decision_saved", { guide: slug, left_open: unknown });
      if (unknown) setAnswer("");
    }
  }

  return <div className="guide-plan-checklist">
    <ul className="interactive-checklist">{items.map((item) => {
      const id = checklistItemId(item);
      return <li key={id}><label><input type="checkbox" checked={checked.includes(id)} onChange={() => toggle(id)} disabled={saving} /><span>{item}</span></label></li>;
    })}</ul>
    <p className="meta">Checks are your preparation notes. They do not validate the product or change manufacturer matches.</p>
    {workspace ? <>
      <p>Saving to <a href={`/sourcing/${workspace.id}`}>{identity?.brandName || identity?.productDescriptor}</a>. <Link href="/products">Choose another saved product</Link></p>
      <button className="btn btn-gold" type="button" onClick={saveChecklist} disabled={saving}>{saving ? "Saving…" : "Save checklist to my plan"}</button>
      <details className="guide-plan-decision">
        <summary>Add a decision to my product plan</summary>
        <form onSubmit={(event) => { event.preventDefault(); void saveDecision(); }}>
          <label htmlFor={`guide-answer-${slug}`}>{action.question}</label>
          <textarea id={`guide-answer-${slug}`} value={answer} maxLength={4000} rows={3} onChange={(event) => { setAnswer(event.target.value); setMessage(""); }} placeholder={action.placeholder} />
          {workspace.fields[action.key].value ? <p className="meta">Current plan: {workspace.fields[action.key].value}. Saving replaces this answer.</p> : null}
          <p className="meta">This records your direction. Process, safety, shelf life, and package compatibility still need qualified review.</p>
          <div className="founder-actions"><button className="btn btn-gold" disabled={saving || !answer.trim()}>Save my answer</button><button type="button" className="text-action" disabled={saving} onClick={() => void saveDecision(true)}>I’m not sure yet</button></div>
        </form>
      </details>
    </> : <p><Link className="btn btn-gold" href={`/sourcing?guide=${slug}`}>Start a plan to save this checklist <span aria-hidden="true">→</span></Link><span className="checklist-save-note">Your checks stay in this tab while you start your plan.</span></p>}
    {message ? <p role="status">{message}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
