"use client";

import { ArrowRight, Check, Cube, PencilSimple, Sparkle, TrashSimple } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { FIELD_DEFINITION_BY_KEY } from "@/lib/sourcing/fields";
import { getPackageDesignPresentation } from "@/lib/sourcing/package-presentation";
import { getPackagingOptions } from "@/lib/sourcing/product-catalog";
import { getProductIdentity, isOpenBrandAnswer } from "@/lib/sourcing/product-identity";
import { getSourcingQuestion } from "@/lib/sourcing/questions";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import type { SourcingFieldKey, SourcingWorkspace as Workspace } from "@/lib/sourcing/types";
import { useSourcingWorkspace } from "./SourcingWorkspaceContext";

const PackagePreview = dynamic(
  () => import("./SourcingPackagePreview").then((module) => module.SourcingPackagePreview),
  { ssr: false, loading: () => <div className="package-direction-preview package-direction-preview-loading" role="status">Loading package preview…</div> },
);

const BRIEF_GROUPS: Array<{ title: string; keys: SourcingFieldKey[] }> = [
  { title: "The product", keys: ["product_category", "product_format", "product_description", "retail_channel"] },
  { title: "Formula & product requirements", keys: ["formula_status", "formulation_assistance", "allergens", "manufacturing_process"] },
  { title: "Production", keys: ["production_volume", "storage_distribution", "preferred_geography", "target_launch_date"] },
];

export function SourcingWorkspace() {
  const { workspace, busy, setBusy, error, setError, agentNote, setAgentNote, acceptWorkspace, openPackageWorkbench } = useSourcingWorkspace();
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [editingKey, setEditingKey] = useState<SourcingFieldKey | null>(null);
  const readiness = useMemo(() => getSourcingReadiness(workspace), [workspace]);
  const relevantPackageLabels = useMemo(() => getPackagingOptions(workspace).slice(0, 3).map((option) => option.label), [workspace]);
  const agentChangedKeys = useMemo(() => new Set(workspace.lastAgentChange?.changedKeys ?? []), [workspace.lastAgentChange]);
  const nextKey = readiness.nextQuestionKey;
  const packageDesignPending = nextKey === "packaging_format"
    && readiness.packageDesignRequired
    && !readiness.packageDesignReady
    && workspace.fields.packaging_format.status === "confirmed";
  const { brandName, productDescriptor } = getProductIdentity(workspace);
  const packagePresentation = workspace.packageDesign
    ? getPackageDesignPresentation(workspace.packageDesign, workspace.artwork)
    : null;

  async function answerNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextKey || !answer.trim()) return;
    const value = answer.trim();
    const brandStillOpen = nextKey === "brand_name" && isOpenBrandAnswer(value);
    setBusy("answer");
    setError("");
    const uncertain = brandStillOpen || /^(?:(?:i(?:'|’)m)\s+)?(?:not\s+)?sure(?:\s+yet)?[.!]?$/i.test(value);
    const response = await workspaceApi(`/api/sourcing/${workspace.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        revision: workspace.revision,
        fieldUpdate: { key: nextKey, value: brandStillOpen ? null : value, status: uncertain ? "needs_decision" : "confirmed", shareWithManufacturer: !uncertain },
      }),
    });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error || "That answer could not be saved.");
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setAnswer("");
      const next = getSourcingReadiness(response.workspace);
      setAgentNote(brandStillOpen
        ? `That’s completely fine—the brand name can stay open. ${next.nextQuestionLabel ? `Next, let’s clarify ${next.nextQuestionLabel.toLowerCase()}.` : "We can keep shaping the product without it."}`
        : uncertain
          ? `That can stay open. I won’t treat it as decided. ${next.nextQuestionLabel ? `Next, let’s clarify ${next.nextQuestionLabel.toLowerCase()}.` : "We can continue without guessing."}`
          : nextKey === "brand_name"
            ? `Got it—${value} is now the brand on this product brief. ${next.nextQuestionLabel ? `Next, let’s clarify ${next.nextQuestionLabel.toLowerCase()}.` : "We can continue shaping the manufacturing plan."}`
            : `Got it—I added ${FIELD_DEFINITION_BY_KEY[nextKey].label.toLowerCase()} to the brief. ${next.matchingReady ? "You now have enough confirmed information for a useful manufacturer search." : `The next useful decision is ${next.nextQuestionLabel?.toLowerCase()}.`}`);
    }
    setBusy(null);
  }

  async function saveInline(key: SourcingFieldKey, value: string) {
    setBusy("answer");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}`, {
      method: "PATCH",
      body: JSON.stringify({ revision: workspace.revision, fieldUpdate: { key, value, status: value.trim() ? "confirmed" : key === "brand_name" ? "needs_decision" : "unknown", shareWithManufacturer: Boolean(value.trim()) } }),
    });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error);
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setEditingKey(null);
      setAgentNote(`${FIELD_DEFINITION_BY_KEY[key].label} is corrected in the shared brief.`);
    } else setError("That correction could not be saved.");
    setBusy(null);
  }

  async function findMatches() {
    setBusy("match");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}/match`, { method: "POST", body: JSON.stringify({ resultLimit: 3 }) });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error);
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setAgentNote(response.workspace.matches.length
        ? `I found ${response.workspace.matches.length} evidence-backed possibilities. I’ve kept unsupported capabilities in the unknown column.`
        : "The current evidence did not produce a responsible manufacturer possibility. I did not add weaker results just to fill the list.");
      router.push(`/sourcing/${workspace.id}/manufacturers`);
    } else setError("Manufacturer matches could not be prepared.");
    setBusy(null);
  }

  async function undoAgentChange() {
    if (!workspace.lastAgentChange) return;
    setBusy("undo");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}`, {
      method: "PATCH",
      body: JSON.stringify({ revision: workspace.revision, undoAgentChangeId: workspace.lastAgentChange.id }),
    });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error);
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setAgentNote("I removed my latest workspace change. Your earlier decisions are restored.");
    } else setError("That agent change could not be undone.");
    setBusy(null);
  }

  return (
    <div className="living-workspace brief-workspace">
      <article className="living-document">
        <p className="document-kicker">First Run · Product brief</p>
        <div className={`document-identity${agentChangedKeys.has("brand_name") || agentChangedKeys.has("product_type") ? " agent-authored-section" : ""}`}>
          <div className="identity-title"><h1>{brandName || productDescriptor}</h1><button type="button" aria-label={brandName ? `Edit brand name: ${brandName}` : `Edit product: ${productDescriptor}`} onClick={() => setEditingKey(brandName ? "brand_name" : "product_type")}><PencilSimple aria-hidden="true" /></button></div>
          {brandName ? <p className="identity-product"><span>{productDescriptor}</span><button type="button" aria-label={`Edit product: ${productDescriptor}`} onClick={() => setEditingKey("product_type")}><PencilSimple aria-hidden="true" /></button></p> : <p className="identity-open"><span>Brand name still open</span><button type="button" onClick={() => setEditingKey("brand_name")}>Add brand name</button></p>}
          {editingKey === "brand_name" ? <BrandNameEditor initialValue={workspace.fields.brand_name.value || ""} onSave={saveInline} onCancel={() => setEditingKey(null)} /> : null}
          {editingKey === "product_type" ? <IdentityProductEditor initialValue={workspace.fields.product_type.value || ""} onSave={saveInline} onCancel={() => setEditingKey(null)} /> : null}
        </div>

        <section className="readiness-card" aria-labelledby="readiness-heading"><div><p className="document-kicker">Honest readiness</p><h2 id="readiness-heading">{readiness.stageLabel}</h2><p>{readiness.stageSummary}</p></div><ol><li className={readiness.searchReady ? "is-done" : "is-current"}><span>{readiness.searchReady ? <Check aria-hidden="true" /> : "1"}</span>Research</li><li className={readiness.manufacturerReady ? "is-done" : readiness.searchReady ? "is-current" : ""}><span>{readiness.manufacturerReady ? <Check aria-hidden="true" /> : "2"}</span>Manufacturer brief</li><li className={readiness.launchReady ? "is-done" : readiness.manufacturerReady ? "is-current" : ""}><span>{readiness.launchReady ? <Check aria-hidden="true" /> : "3"}</span>Launch planning</li></ol></section>

        {workspace.lastAgentChange ? <details className="agent-change-review" open><summary><Sparkle aria-hidden="true" weight="fill" /> Latest agent update · {workspace.lastAgentChange.changedKeys.length} change{workspace.lastAgentChange.changedKeys.length === 1 ? "" : "s"}</summary><div><ul>{workspace.lastAgentChange.changedKeys.map((key) => <li key={key}><strong>{FIELD_DEFINITION_BY_KEY[key].label}</strong><span>{workspace.fields[key].value || "Left open"}</span></li>)}</ul><button type="button" onClick={undoAgentChange} disabled={busy !== null}><TrashSimple aria-hidden="true" /> {busy === "undo" ? "Undoing…" : "Undo latest agent update"}</button></div></details> : null}

        {BRIEF_GROUPS.map((group) => (
          <section className="brief-section" key={group.title}>
            <div className="section-heading"><h2>{group.title}</h2></div>
            <dl className="field-grid">
              {group.keys.map((key) => <EditableField key={key} fieldKey={key} workspace={workspace} agentChanged={agentChangedKeys.has(key)} editing={editingKey === key} onEdit={() => setEditingKey(key)} onCancel={() => setEditingKey(null)} onSave={saveInline} />)}
            </dl>
          </section>
        ))}

        <section className={`brief-section packaging-section${agentChangedKeys.has("packaging_format") ? " agent-authored-section" : ""}`}>
          <div className="section-heading"><h2>Packaging direction</h2><button type="button" className="section-action" onClick={() => openPackageWorkbench()}><Cube aria-hidden="true" /> {workspace.packageDesign || workspace.fields.packaging_format.status === "confirmed" ? "Refine in 3D" : "Open 3D workbench"}</button></div>
          {workspace.packageDesign && packagePresentation ? <div className="package-writeback"><PackagePreview workspaceId={workspace.id} design={workspace.packageDesign} artwork={workspace.artwork} onOpen={() => openPackageWorkbench()} /><div><strong>{packagePresentation.direction}</strong><span>{packagePresentation.appearance}</span><small>{packagePresentation.validation}</small></div></div> : workspace.fields.packaging_format.value ? <div className="package-writeback"><div><strong>{workspace.fields.packaging_format.value}</strong><span>{workspace.fields.packaging_format.status === "proposed" ? "Agent proposal · needs your review" : workspace.fields.packaging_format.status === "needs_decision" ? "Intentionally left open" : "Working package direction"}</span><small>{workspace.fields.packaging_format.reason || (workspace.fields.packaging_format.status === "confirmed" ? "3D refinement is still needed for the manufacturer-ready brief." : "Open the workbench when a visual comparison would help.")}</small></div></div> : <p className="open-value">No package direction is locked yet. Start with {formatChoiceList(relevantPackageLabels)}, or open the other supported 3D models when you need them.</p>}
        </section>

        <aside className="agent-exchange" aria-live="polite"><Sparkle aria-hidden="true" weight="fill" /><div><span>Product collaborator</span><p>{agentNote}</p></div></aside>

        <section className="agent-prompt" aria-labelledby="next-question-heading">
          <div className="prompt-line"><div><span>{readiness.searchReady ? "Research is available" : "Next useful decision"}</span><h2 id="next-question-heading">{packageDesignPending ? "Review and save your packaging direction in 3D." : nextKey ? getSourcingQuestion(workspace, nextKey) : "Your brief has enough confirmed detail for a focused manufacturer search."}</h2>{readiness.whyItMatters && nextKey ? <p>{readiness.whyItMatters}</p> : null}</div>{nextKey === "packaging_format" && !packageDesignPending ? <button className="text-action" type="button" onClick={() => openPackageWorkbench()}>Compare packages in 3D</button> : null}</div>
          {packageDesignPending ? <button className="primary-action" type="button" onClick={() => openPackageWorkbench()}><Cube aria-hidden="true" /> Refine packaging in 3D</button> : nextKey ? <form className="composer" onSubmit={answerNext}><label className="sr-only" htmlFor="next-decision-answer">Your answer to the next product decision</label><textarea id="next-decision-answer" rows={2} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer naturally, or say “I’m not sure”…" maxLength={4_000} disabled={busy !== null} /><button type="submit" disabled={!answer.trim() || busy !== null}>{busy === "answer" ? "Adding…" : <>Add to brief <ArrowRight aria-hidden="true" /></>}</button></form> : <button className="primary-action" type="button" onClick={findMatches} disabled={busy !== null}>{busy === "match" ? "Researching matches…" : "Find evidence-backed manufacturers"}</button>}
          {nextKey && readiness.searchReady ? <div className="research-now"><span>You can keep refining this later.</span><button className="text-action" type="button" onClick={findMatches} disabled={busy !== null}>{busy === "match" ? "Researching…" : "Research manufacturers now"}</button></div> : null}
        </section>

        {error ? <p className="sourcing-error" role="alert">{error}</p> : null}

        {workspace.matchesUpdatedAt ? <section className="brief-section manufacturing-writeback" aria-labelledby="manufacturing-summary-heading"><div><p className="document-kicker">Manufacturer research</p><h2 id="manufacturing-summary-heading">{workspace.matches.length ? `${workspace.matches.length} possibilit${workspace.matches.length === 1 ? "y" : "ies"} ready to review` : "No current possibilities"}</h2><p>{workspace.selectedManufacturerSlugs.length ? `${workspace.selectedManufacturerSlugs.length} selected. Review evidence and next steps in the focused manufacturer workspace.` : "Review the evidence, unknowns, and possible conflicts away from the product brief."}</p></div><Link href={`/sourcing/${workspace.id}/manufacturers`} prefetch={false}>Review manufacturers <ArrowRight aria-hidden="true" /></Link></section> : null}
      </article>
    </div>
  );
}

function formatChoiceList(labels: string[]): string {
  if (labels.length < 2) return labels[0]?.toLowerCase() ?? "a relevant package";
  return `${labels.slice(0, -1).map((label) => label.toLowerCase()).join(", ")} or ${labels.at(-1)?.toLowerCase()}`;
}

function EditableField({ fieldKey, workspace, agentChanged, editing, onEdit, onCancel, onSave }: {
  fieldKey: SourcingFieldKey; workspace: Workspace; agentChanged: boolean; editing: boolean; onEdit: () => void; onCancel: () => void; onSave: (key: SourcingFieldKey, value: string) => Promise<void>;
}) {
  const field = workspace.fields[fieldKey];
  if (editing) return <FieldEditor fieldKey={fieldKey} initialValue={field.value || ""} onSave={onSave} onCancel={onCancel} />;
  const attribution = field.evidence?.length ? "Source verified" : field.status === "proposed" ? "Agent suggested · needs your review" : field.status === "needs_decision" || !field.value ? "Still open" : field.updatedBy === "agent" ? "Agent captured your answer" : field.updatedBy === "founder" ? "You confirmed" : null;
  const validationReason = field.reason && /validat|commercial|shelf[- ]life|line compatibility|qualified/i.test(field.reason);
  const reasonLabel = validationReason ? "Needs validation" : field.status === "proposed" ? "Why suggested" : "Captured from your idea";
  return <div className={`brief-field${field.value ? "" : " field-muted"}${agentChanged ? " agent-changed" : ""}`}><dt>{FIELD_DEFINITION_BY_KEY[fieldKey].label}</dt><dd>{field.value || "Still open"}</dd>{attribution ? <p>{attribution}</p> : null}{field.reason ? <small><strong>{reasonLabel}</strong> · {field.reason}</small> : null}{field.status === "proposed" && field.value ? <button className="accept-proposal" type="button" onClick={() => void onSave(fieldKey, field.value!)}><Check aria-hidden="true" /> Accept suggestion</button> : null}<button className="field-edit" type="button" aria-label={`Edit ${FIELD_DEFINITION_BY_KEY[fieldKey].label}`} onClick={onEdit}><PencilSimple aria-hidden="true" /></button></div>;
}

function FieldEditor({ fieldKey, initialValue, onSave, onCancel }: {
  fieldKey: SourcingFieldKey;
  initialValue: string;
  onSave: (key: SourcingFieldKey, value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = `edit-${fieldKey}`;
  return <div className="brief-field field-editor"><dt><label htmlFor={inputId}>{FIELD_DEFINITION_BY_KEY[fieldKey].label}</label></dt><dd><textarea id={inputId} ref={inputRef} defaultValue={initialValue} rows={3} /><span><button type="button" onClick={() => void onSave(fieldKey, inputRef.current?.value ?? "")}>Save</button><button type="button" onClick={onCancel}>Cancel</button></span></dd></div>;
}

async function workspaceApi(url: string, init: RequestInit): Promise<{ workspace?: Workspace; error?: string }> {
  try {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers }, cache: "no-store" });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { workspace?: Workspace; error?: string };
      return { ...failure, error: failure.error || `Request failed (${response.status}).` };
    }
    return await response.json().catch(() => ({ error: "The server returned an unreadable response." })) as { workspace?: Workspace; error?: string };
  } catch {
    return { error: "The product workspace could not reach the server. Check your connection and try again." };
  }
}

function BrandNameEditor({ initialValue, onSave, onCancel }: {
  initialValue: string;
  onSave: (key: SourcingFieldKey, value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="identity-editor"><label htmlFor="edit-brand-name">Brand name</label><input id="edit-brand-name" ref={inputRef} defaultValue={initialValue} placeholder="Mya’s Bakery" maxLength={4_000} /><div><button type="button" onClick={() => void onSave("brand_name", inputRef.current?.value ?? "")}>Save brand</button><button type="button" onClick={onCancel}>Cancel</button></div></div>;
}

function IdentityProductEditor({ initialValue, onSave, onCancel }: {
  initialValue: string;
  onSave: (key: SourcingFieldKey, value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="identity-editor"><label htmlFor="edit-product-type">Product</label><input id="edit-product-type" ref={inputRef} defaultValue={initialValue} placeholder="Packaged banana bread" maxLength={4_000} /><div><button type="button" onClick={() => void onSave("product_type", inputRef.current?.value ?? "")}>Save product</button><button type="button" onClick={onCancel}>Cancel</button></div></div>;
}
