"use client";

import Link from "next/link";
import { useState } from "react";
import { calculateRunCosts, FOUNDER_STAGES, type FounderStage } from "@/lib/sourcing/preparation";
import { useSourcingWorkspace } from "./SourcingWorkspaceContext";

export function FounderLearning({ guides }: { guides: { slug: string; title: string }[] }) {
  const { workspace, acceptWorkspace, busy } = useSourcingWorkspace();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const stage = FOUNDER_STAGES.find((item) => item.value === workspace.preparation.stage);
  const savedGuides = guides.filter((guide) => Object.hasOwn(workspace.preparation.checklists, guide.slug));
  const costs = workspace.preparation.costWorksheet ? calculateRunCosts(workspace.preparation.costWorksheet) : null;

  async function changeStage(value: FounderStage | "") {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/sourcing/${workspace.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: workspace.revision, preparationUpdate: { stage: value || null } }) });
      const payload = await response.json();
      if (payload.workspace) acceptWorkspace(payload.workspace);
      if (!response.ok) throw new Error(payload.error || "Your stage could not be saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your stage could not be saved."); }
    finally { setSaving(false); }
  }

  return <section className="brief-section founder-learning" aria-labelledby="founder-learning-heading">
    <h2 id="founder-learning-heading">Learning and first-run costs</h2>
    <p>{stage?.description ?? "Use a guide when you need help with a decision. Your checklist and cost estimates stay with this plan."} <Link href={stage?.guide ?? "/guides"}>{stage ? "Open the guide for this stage" : "Choose a guide"} <span aria-hidden="true">→</span></Link></p>
    <details><summary>{stage ? `Your starting stage: ${stage.label}` : "Choose your starting stage"}</summary><label>Where are you starting?<select value={workspace.preparation.stage ?? ""} onChange={(event) => void changeStage(event.target.value as FounderStage | "")} disabled={saving || busy !== null}><option value="">I’m not sure yet</option>{FOUNDER_STAGES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><p className="meta">This helps you choose a lesson. It does not confirm recipe or production readiness.</p></details>
    {savedGuides.length ? <div className="saved-guide-links"><h3>Your saved checklists</h3><ul>{savedGuides.map((guide) => <li key={guide.slug}><Link href={`/guides/${guide.slug}#checklist`}>{guide.title}</Link></li>)}</ul></div> : null}
    <p>{costs?.subtotal !== null && costs?.subtotal !== undefined ? <><strong>{costs.subtotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong> {costs.complete ? "estimated run cost" : "subtotal of entered costs"}. </> : null}<Link href="/guides/first-run-costs">{workspace.preparation.costWorksheet ? "Review your private cost worksheet" : "Explore first-run costs"} <span aria-hidden="true">→</span></Link></p>
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
