"use client";

import { ArrowRight, Check, Copy, Cube, PencilSimple, Sparkle } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { WebMcpSourcingTools } from "./WebMcpSourcingTools";
import { FIELD_DEFINITION_BY_KEY } from "@/lib/sourcing/fields";
import { getPackageDesignPresentation } from "@/lib/sourcing/package-presentation";
import { getProductIdentity, isOpenBrandAnswer } from "@/lib/sourcing/product-identity";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import type { ManufacturerMatch, OutreachDraft, SourcingFieldKey, SourcingWorkspace as Workspace } from "@/lib/sourcing/types";

const PackageWorkbench = dynamic(
  () => import("./SourcingPackageWorkbench").then((module) => module.SourcingPackageWorkbench),
  { ssr: false, loading: () => <div className="workbench-loading" role="status">Opening the 3D packaging workbench…</div> },
);

const PackagePreview = dynamic(
  () => import("./SourcingPackagePreview").then((module) => module.SourcingPackagePreview),
  { ssr: false, loading: () => <div className="package-direction-preview package-direction-preview-loading" role="status">Loading package preview…</div> },
);

const BRIEF_GROUPS: Array<{ title: string; keys: SourcingFieldKey[] }> = [
  { title: "The product", keys: ["product_format", "product_description", "retail_channel"] },
  { title: "Formula & product requirements", keys: ["formula_status", "formulation_assistance", "allergens", "manufacturing_process"] },
  { title: "Production", keys: ["production_volume", "storage_distribution", "preferred_geography", "target_launch_date"] },
];

const AGENT_QUESTIONS: Partial<Record<SourcingFieldKey, string>> = {
  brand_name: "Do you already have a brand name? It is completely fine if you are still deciding.",
  product_type: "What is the product, in the simplest words you would use with a customer?",
  product_format: "How will one customer receive or eat it—for example, a mini loaf, two slices, or a full loaf?",
  packaging_format: "What package are you leaning toward? You can also open the 3D workbench and compare the real can, bottle, jar, and bag models.",
  packaging_size: "What size or portion should one retail unit contain? A rough answer is enough.",
  formula_status: "How far along is the recipe: idea, draft, tested, or ready to scale?",
  formulation_assistance: "Would you want the manufacturer to help develop or scale the recipe?",
  carbonation: "Should the drink be carbonated, still, or is that still open?",
  storage_distribution: "Should the finished product be shelf-stable, refrigerated, or frozen? If you are unsure, say that.",
  production_volume: "What first run feels realistic? A range such as 1,000–5,000 units works well.",
};

export function SourcingWorkspace({
  initialWorkspace,
  ownership,
}: {
  initialWorkspace: Workspace;
  storageAdapter: "postgres" | "filesystem" | "unavailable";
  ownership: "user" | "guest" | "development";
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<"answer" | "match" | "select" | "outreach" | null>(null);
  const [error, setError] = useState("");
  const [agentNote, setAgentNote] = useState("I’ve started your brief from what you told me. Let’s resolve one useful decision at a time.");
  const [editingKey, setEditingKey] = useState<SourcingFieldKey | null>(null);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const reviewRef = useRef<HTMLElement>(null);
  const readiness = useMemo(() => getSourcingReadiness(workspace), [workspace]);
  const selectedManufacturerSlugs = useMemo(() => new Set(workspace.selectedManufacturerSlugs), [workspace.selectedManufacturerSlugs]);
  const nextKey = readiness.nextQuestionKey;
  const { brandName, productDescriptor } = getProductIdentity(workspace);
  const packagePresentation = workspace.packageDesign
    ? getPackageDesignPresentation(workspace.packageDesign, workspace.artwork)
    : null;
  const openReview = useCallback(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  const acceptWorkspace = useCallback((next: Workspace) => setWorkspace(next), []);

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
    if (!response.workspace) {
      setError(response.error || "That answer could not be saved.");
    } else {
      setWorkspace(response.workspace);
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
    if (response.workspace) {
      setWorkspace(response.workspace);
      setEditingKey(null);
      setAgentNote(`${FIELD_DEFINITION_BY_KEY[key].label} is corrected in the shared brief.`);
    } else setError(response.error || "That correction could not be saved.");
    setBusy(null);
  }

  async function findMatches() {
    setBusy("match");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}/match`, { method: "POST", body: JSON.stringify({ resultLimit: 5 }) });
    if (response.workspace) {
      setWorkspace(response.workspace);
      setAgentNote(`I found ${response.workspace.matches.length} evidence-backed possibilities. I’ve kept unsupported capabilities in the unknown column.`);
    } else setError(response.error || "Manufacturer matches could not be prepared.");
    setBusy(null);
  }

  async function toggleManufacturer(slug: string) {
    const selected = workspace.selectedManufacturerSlugs.includes(slug)
      ? workspace.selectedManufacturerSlugs.filter((item) => item !== slug)
      : [...workspace.selectedManufacturerSlugs, slug].slice(0, 3);
    setBusy("select");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}`, { method: "PATCH", body: JSON.stringify({ revision: workspace.revision, selectedManufacturerSlugs: selected }) });
    if (response.workspace) setWorkspace(response.workspace);
    else setError(response.error || "That selection could not be saved.");
    setBusy(null);
  }

  async function prepareIntroductions() {
    setBusy("outreach");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}/outreach`, {
      method: "POST",
      body: JSON.stringify({ selectedManufacturerIds: workspace.selectedManufacturerSlugs }),
    });
    if (response.workspace) {
      setWorkspace(response.workspace);
      setAgentNote(`${workspace.selectedManufacturerSlugs.length} manufacturer-specific introduction${workspace.selectedManufacturerSlugs.length === 1 ? " is" : "s are"} ready for your review. Nothing was sent.`);
      window.setTimeout(openReview, 0);
    } else setError(response.error || "The introductions could not be prepared.");
    setBusy(null);
  }

  return (
    <div className="living-workspace">
      <WebMcpSourcingTools workspaceId={workspace.id} onWorkspaceChanged={acceptWorkspace} onOpenIntroductionReview={openReview} />
      {ownership === "guest" ? <nav className="workspace-actions" aria-label="Workspace actions"><Link className="save-product" href={`/auth?workspaceId=${workspace.id}`}>Save this product</Link></nav> : ownership === "user" ? <nav className="workspace-actions" aria-label="Workspace actions"><Link href="/products">Your products</Link></nav> : null}

      <article className="living-document">
        <p className="document-kicker">Product brief</p>
        <div className="document-identity">
          <div className="identity-title"><h1>{brandName || productDescriptor}</h1><button type="button" aria-label={brandName ? `Edit brand name: ${brandName}` : `Edit product: ${productDescriptor}`} onClick={() => setEditingKey(brandName ? "brand_name" : "product_type")}><PencilSimple aria-hidden="true" /></button></div>
          {brandName ? <p className="identity-product"><span>{productDescriptor}</span><button type="button" aria-label={`Edit product: ${productDescriptor}`} onClick={() => setEditingKey("product_type")}><PencilSimple aria-hidden="true" /></button></p> : <p className="identity-open"><span>Brand name still open</span><button type="button" onClick={() => setEditingKey("brand_name")}>Add brand name</button></p>}
          {editingKey === "brand_name" ? <BrandNameEditor initialValue={workspace.fields.brand_name.value || ""} onSave={saveInline} onCancel={() => setEditingKey(null)} /> : null}
          {editingKey === "product_type" ? <IdentityProductEditor initialValue={workspace.fields.product_type.value || ""} onSave={saveInline} onCancel={() => setEditingKey(null)} /> : null}
        </div>

        {BRIEF_GROUPS.map((group) => (
          <section className="brief-section" key={group.title}>
            <div className="section-heading"><h2>{group.title}</h2></div>
            <dl className="field-grid">
              {group.keys.map((key) => <EditableField key={key} fieldKey={key} workspace={workspace} editing={editingKey === key} onEdit={() => setEditingKey(key)} onCancel={() => setEditingKey(null)} onSave={saveInline} />)}
            </dl>
          </section>
        ))}

        <section className="brief-section packaging-section">
          <div className="section-heading"><h2>Packaging direction</h2><button type="button" className="section-action" onClick={() => setWorkbenchOpen(true)}><Cube aria-hidden="true" /> {workspace.packageDesign ? "Refine in 3D" : "Open 3D workbench"}</button></div>
          {workspace.packageDesign && packagePresentation ? <div className="package-writeback"><PackagePreview workspaceId={workspace.id} design={workspace.packageDesign} artwork={workspace.artwork} onOpen={() => setWorkbenchOpen(true)} /><div><strong>{packagePresentation.direction}</strong><span>{packagePresentation.appearance}</span><small>{packagePresentation.validation}</small></div></div> : workspace.fields.packaging_format.value ? <div className="package-writeback"><div><strong>{workspace.fields.packaging_format.value}</strong><span>{workspace.fields.packaging_format.status === "needs_decision" ? "Intentionally left open" : "Working package direction"}</span><small>Open the workbench when a visual comparison would help.</small></div></div> : <p className="open-value">No package direction is locked yet. The collaborator can help narrow it, or you can compare the real jar, bottle, can, and bag models now.</p>}
        </section>

        <aside className="agent-exchange" aria-live="polite"><Sparkle aria-hidden="true" weight="fill" /><div><span>Product collaborator</span><p>{agentNote}</p></div></aside>

        <section className="agent-prompt" aria-labelledby="next-question-heading">
          <div className="prompt-line"><div><span>{readiness.matchingReady ? "Ready for the next step" : "Next useful decision"}</span><h2 id="next-question-heading">{nextKey ? AGENT_QUESTIONS[nextKey] || `What should manufacturers know about ${FIELD_DEFINITION_BY_KEY[nextKey].label.toLowerCase()}?` : "Your brief has enough confirmed detail for a focused manufacturer search."}</h2>{readiness.whyItMatters && nextKey ? <p>{readiness.whyItMatters}</p> : null}</div>{nextKey === "packaging_format" ? <button className="text-action" type="button" onClick={() => setWorkbenchOpen(true)}>Compare packages in 3D</button> : null}</div>
          {nextKey ? <form className="composer" onSubmit={answerNext}><label className="sr-only" htmlFor="next-decision-answer">Your answer to the next product decision</label><textarea id="next-decision-answer" rows={2} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer naturally, or say “I’m not sure”…" maxLength={4_000} disabled={busy !== null} /><button type="submit" disabled={!answer.trim() || busy !== null}>{busy === "answer" ? "Adding…" : <>Add to brief <ArrowRight aria-hidden="true" /></>}</button></form> : <button className="primary-action" type="button" onClick={findMatches} disabled={busy !== null}>{busy === "match" ? "Researching matches…" : "Find evidence-backed manufacturers"}</button>}
        </section>

        {error ? <p className="sourcing-error" role="alert">{error}</p> : null}

        {workspace.matches.length ? <section className="brief-section manufacturer-section"><div className="section-heading"><div><p className="document-kicker">Evidence, not guesses</p><h2>Manufacturer possibilities</h2></div><span>Select up to 3</span></div><p className="section-intro">These are possibilities to investigate. “Unknown” means the public evidence does not answer the requirement—it is not treated as a match.</p><div className="match-list">{workspace.matches.map((match) => <MatchRow key={match.manufacturerSlug} match={match} selected={selectedManufacturerSlugs.has(match.manufacturerSlug)} disabled={busy !== null} onToggle={() => toggleManufacturer(match.manufacturerSlug)} />)}</div>{workspace.selectedManufacturerSlugs.length ? <div className="prepare-introductions"><div><strong>{workspace.selectedManufacturerSlugs.length} selected</strong><span>Each manufacturer gets its own message and visible review.</span></div><button type="button" onClick={prepareIntroductions} disabled={busy !== null}>{busy === "outreach" ? "Preparing…" : `Prepare ${workspace.selectedManufacturerSlugs.length} introduction${workspace.selectedManufacturerSlugs.length === 1 ? "" : "s"}`}</button></div> : null}</section> : null}

        {workspace.outreachDrafts.length ? <section className="brief-section introduction-section" ref={reviewRef}><div className="section-heading"><div><p className="document-kicker">Founder review required</p><h2>Manufacturer introductions</h2></div><span>Nothing has been sent</span></div><p className="section-intro">Review each recipient, exact message, and shared product details. Approval records your decision; contacting the manufacturer remains a separate human action.</p><div className="introduction-list">{latestDrafts(workspace.outreachDrafts).map((draft) => <DraftReview key={`${draft.id}-${draft.version}`} draft={draft} workspace={workspace} onWorkspace={setWorkspace} />)}</div></section> : null}
      </article>
      {workbenchOpen ? <PackageWorkbench workspace={workspace} onClose={() => setWorkbenchOpen(false)} onSaved={setWorkspace} /> : null}
    </div>
  );
}

function EditableField({ fieldKey, workspace, editing, onEdit, onCancel, onSave }: {
  fieldKey: SourcingFieldKey; workspace: Workspace; editing: boolean; onEdit: () => void; onCancel: () => void; onSave: (key: SourcingFieldKey, value: string) => Promise<void>;
}) {
  const field = workspace.fields[fieldKey];
  if (editing) return <FieldEditor fieldKey={fieldKey} initialValue={field.value || ""} onSave={onSave} onCancel={onCancel} />;
  return <div className={`brief-field${field.value ? "" : " field-muted"}`}><dt>{FIELD_DEFINITION_BY_KEY[fieldKey].label}</dt><dd>{field.value || "Still open"}</dd>{field.status === "proposed" ? <p>Suggested · needs your review</p> : field.status === "needs_decision" ? <p>Intentionally left open</p> : null}<button className="field-edit" type="button" aria-label={`Edit ${FIELD_DEFINITION_BY_KEY[fieldKey].label}`} onClick={onEdit}><PencilSimple aria-hidden="true" /></button></div>;
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

function MatchRow({ match, selected, disabled, onToggle }: { match: ManufacturerMatch; selected: boolean; disabled: boolean; onToggle: () => void }) {
  return <article className={`match-row${selected ? " is-selected" : ""}`}><div className="match-heading"><div><h3>{match.manufacturerName}</h3><p>{match.location}</p></div><button type="button" className="select-control" aria-pressed={selected} onClick={onToggle} disabled={disabled}>{selected ? <><Check aria-hidden="true" /> Selected</> : "Select"}</button></div><p className="fit-reason"><strong>Why it may fit</strong>{match.fitExplanation}</p><div className="evidence-columns"><div><strong>Supported by sources</strong><ul>{match.supportedMatches.length ? match.supportedMatches.map((item) => <li key={item}>{item}</li>) : <li>No required capability is treated as proven yet.</li>}</ul></div><div><strong>Still needs confirmation</strong><ul>{[...match.possibleConflicts, ...match.unknowns].slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div></div><details><summary>Review source evidence</summary>{match.evidence.map((item) => <div className="evidence-line" key={item.requirementKey}><span>{item.status.replaceAll("_", " ")}</span><strong>{item.requirementLabel}</strong><p>{item.claim}</p>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel || "Open source"} ↗</a> : <small>No public source found</small>}</div>)}</details><Link href={`/manufacturers/${match.manufacturerSlug}`}>View directory profile ↗</Link></article>;
}

function DraftReview({ draft, workspace, onWorkspace }: { draft: OutreachDraft; workspace: Workspace; onWorkspace: (workspace: Workspace) => void }) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const approved = draft.deliveryStatus === "approved" && draft.approvedVersion === draft.version;
  async function approve() {
    setBusy(true);
    try {
      const response = await workspaceApi(`/api/sourcing/${workspace.id}/outreach/${draft.id}`, { method: "PATCH", body: JSON.stringify({ subject: subjectRef.current?.value ?? draft.subject, body: bodyRef.current?.value ?? draft.body, includedFieldKeys: draft.includedFieldKeys }) });
      if (response.workspace) onWorkspace(response.workspace);
    } finally {
      setBusy(false);
    }
  }
  async function copyMessage() {
    await navigator.clipboard.writeText(`Subject: ${subjectRef.current?.value ?? draft.subject}\n\n${bodyRef.current?.value ?? draft.body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <article className="introduction-card"><header><div><span>To</span><h3>{draft.manufacturerName}</h3></div><span className={approved ? "approved-state" : "draft-state"}>{approved ? "Approved" : "Draft"}</span></header><label>Subject<input ref={subjectRef} defaultValue={draft.subject} maxLength={180} readOnly={approved} /></label><label>Message<textarea ref={bodyRef} defaultValue={draft.body} rows={12} maxLength={12_000} readOnly={approved} /></label><details><summary>{draft.includedFieldKeys.length} product details included</summary><ul>{draft.includedFieldKeys.map((key) => <li key={key}><strong>{FIELD_DEFINITION_BY_KEY[key].label}</strong><span>{workspace.fields[key].value}</span></li>)}</ul></details><footer><p>{approved ? "Approved for your use. Nothing was sent by The Line List." : "Review and approve this exact version before you use it."}</p>{approved ? <><button type="button" onClick={copyMessage}><Copy aria-hidden="true" /> {copied ? "Copied" : "Copy approved message"}</button><Link href={`/manufacturers/${draft.manufacturerSlug}`}>Open manufacturer profile ↗</Link></> : <button type="button" onClick={approve} disabled={busy}>{busy ? "Approving…" : "Approve this introduction"}</button>}</footer></article>;
}

async function workspaceApi(url: string, init: RequestInit): Promise<{ workspace?: Workspace; error?: string }> {
  try {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers }, cache: "no-store" });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { error?: string };
      return { error: failure.error || `Request failed (${response.status}).` };
    }
    return await response.json().catch(() => ({ error: "The server returned an unreadable response." })) as { workspace?: Workspace; error?: string };
  } catch {
    return { error: "The product workspace could not reach the server. Check your connection and try again." };
  }
}

function latestDrafts(drafts: OutreachDraft[]): OutreachDraft[] {
  const found = new Map<string, OutreachDraft>();
  for (const draft of drafts) if (!found.has(draft.manufacturerSlug)) found.set(draft.manufacturerSlug, draft);
  return [...found.values()];
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
