"use client";

import { FIELD_DEFINITION_BY_KEY, NEVER_SHARE_FIELD_KEYS, SOURCING_FIELD_DEFINITIONS } from "@/lib/sourcing/fields";
import { hasMinimumMatchingInfo } from "@/lib/sourcing/readiness";
import type { OutreachDraft, SourcingField, SourcingFieldKey, SourcingFieldStatus, SourcingWorkspace as Workspace } from "@/lib/sourcing/types";
import Link from "next/link";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebMcpSourcingTools } from "./WebMcpSourcingTools";

type Stage = "plan" | "matches" | "contact";

interface QuestionDefinition {
  key: SourcingFieldKey;
  title: string;
  help: string;
  options?: string[];
  placeholder?: string;
}

const QUESTIONS: QuestionDefinition[] = [
  { key: "product_type", title: "What do you want to make?", help: "A simple description is enough to start.", placeholder: "A hot sauce for grocery stores" },
  { key: "packaging_format", title: "How do you picture it being packaged?", help: "This helps us look for manufacturers with the right type of line.", options: ["Cans", "Bottles", "Jars", "Pouches", "I’m not sure yet"] },
  { key: "formulation_assistance", title: "Do you need help creating the recipe?", help: "Some manufacturers help develop recipes; others expect a finished formula.", options: ["Yes, I need help", "I have a recipe, but it needs work", "No, my recipe is ready", "I’m not sure yet"] },
  { key: "carbonation", title: "Should your drink be carbonated?", help: "Carbonation changes which beverage lines may work.", options: ["Carbonated", "Still", "I’m not sure yet"] },
  { key: "formula_status", title: "Is your recipe ready?", help: "It is completely normal to start with only an idea.", options: ["Yes, it is ready", "I have a recipe, but it needs work", "No, I need help creating it", "I’m not sure yet"] },
  { key: "production_volume", title: "How much do you want to make for your first run?", help: "A rough range is useful. You do not need a perfect number.", options: ["Fewer than 1,000 units", "1,000 to 5,000 units", "More than 5,000 units", "I’m not sure yet"] },
];

const PLAN_SUMMARY_KEYS: SourcingFieldKey[] = [
  "product_type", "product_description", "packaging_format", "packaging_size", "budget", "target_launch_date", "formulation_assistance", "preferred_geography", "carbonation", "production_volume", "formula_status",
];

const STATUS_LABELS: Record<SourcingFieldStatus, string> = {
  confirmed: "You said",
  proposed: "Suggested",
  unknown: "Still need",
  needs_decision: "Still need",
  rejected: "Not using",
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

function initialStage(workspace: Workspace): Stage {
  if (workspace.selectedManufacturerSlugs.length) return "contact";
  if (workspace.matches.length) return "matches";
  return "plan";
}

export function SourcingWorkspace({
  initialWorkspace,
  storageAdapter,
  demoRecipient,
  emailConfigured,
  chatGptReady = false,
}: {
  initialWorkspace: Workspace;
  storageAdapter: "upstash" | "filesystem" | "memory";
  demoRecipient: string | null;
  emailConfigured: boolean;
  chatGptReady?: boolean;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [activeStage, setActiveStage] = useState<Stage>(() => initialStage(initialWorkspace));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showCopiedTip, setShowCopiedTip] = useState(chatGptReady);
  const stageRef = useRef<HTMLElement>(null);

  const onWorkspaceChanged = useCallback((next: Workspace) => {
    setWorkspace(next);
    const activityKind = next.activity[0]?.kind;
    setActiveStage(activityKind === "matched" ? "matches" : activityKind === "drafted" || activityKind === "approved" || activityKind === "sent" ? "contact" : "plan");
  }, []);

  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, [activeStage]);

  async function run(label: string, operation: () => Promise<{ workspace: Workspace }>) {
    setBusy(label);
    setError("");
    try {
      const result = await operation();
      setWorkspace(result.workspace);
      return result.workspace;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function updateField(key: SourcingFieldKey, value: string | null, status: SourcingFieldStatus, shareWithManufacturer?: boolean) {
    return run(`Saving ${friendlyFieldLabel(key)}…`, () => requestJson(`/api/sourcing/${workspace.id}`, {
      method: "PATCH",
      body: JSON.stringify({ revision: workspace.revision, fieldUpdate: { key, value, status, shareWithManufacturer } }),
    }));
  }

  async function findMatches() {
    const next = await run("Finding your strongest matches…", () => requestJson(`/api/sourcing/${workspace.id}/match`, {
      method: "POST",
      body: JSON.stringify({ resultLimit: 3 }),
    }));
    if (next) setActiveStage("matches");
  }

  async function selectManufacturer(slug: string) {
    const next = await run("Adding to your shortlist…", () => requestJson(`/api/sourcing/${workspace.id}`, {
      method: "PATCH",
      body: JSON.stringify({ revision: workspace.revision, selectedManufacturerSlugs: [slug] }),
    }));
    if (next) setActiveStage("contact");
  }

  async function prepareOutreach() {
    if (!workspace.selectedManufacturerSlugs.length) return;
    await run("Drafting your introduction…", () => requestJson(`/api/sourcing/${workspace.id}/outreach`, {
      method: "POST",
      body: JSON.stringify({ selectedManufacturerIds: workspace.selectedManufacturerSlugs }),
    }));
  }

  const planReady = hasMinimumMatchingInfo(workspace);
  const latestActivity = workspace.activity[0];
  const selectedSlug = workspace.selectedManufacturerSlugs[0];
  const selectedMatch = workspace.matches.find((match) => match.manufacturerSlug === selectedSlug);
  const selectedDraft = workspace.outreachDrafts.find((draft) => draft.manufacturerSlug === selectedSlug);
  const selectedInquiry = workspace.inquiries.find((inquiry) => inquiry.manufacturerSlug === selectedSlug);

  return (
    <>
      <WebMcpSourcingTools workspaceId={workspace.id} onWorkspaceChanged={onWorkspaceChanged} />
      <header className="sourcing-workspace-header">
        <div>
          <p className="kicker">Your product plan</p>
          <h1>{workspace.fields.product_type.value || "Let’s shape your product idea"}</h1>
          <p className="lede">You and ChatGPT can build this together. The Line List keeps the plan, evidence, and introduction in one place.</p>
        </div>
        <div className="workspace-save-state" role="status" aria-live="polite">
          <span className={busy ? "is-busy" : ""} aria-hidden="true" />
          <strong>{busy || "Saved"}</strong>
          <small>{storageAdapter === "upstash" ? "Your plan is saved" : storageAdapter === "filesystem" ? "Saved for local testing" : "Saved on this demo instance"}</small>
        </div>
      </header>

      <nav className="sourcing-stage-nav" aria-label="Product plan progress">
        <StageButton number="1" label="Your plan" active={activeStage === "plan"} complete={planReady} onClick={() => setActiveStage("plan")} />
        <StageButton number="2" label="Matches" active={activeStage === "matches"} complete={Boolean(workspace.matches.length)} disabled={!planReady && !workspace.matches.length} onClick={() => setActiveStage("matches")} />
        <StageButton number="3" label="Contact" active={activeStage === "contact"} complete={Boolean(selectedInquiry)} disabled={!selectedSlug} onClick={() => setActiveStage("contact")} />
      </nav>

      {showCopiedTip ? (
        <div className="chatgpt-ready-note" role="status">
          <div><strong>Copied. Paste the prompt into ChatGPT to begin.</strong><p>Keep this product plan open. No manufacturer can be contacted without your approval.</p></div>
          <button type="button" aria-label="Dismiss copied prompt message" onClick={() => setShowCopiedTip(false)}>×</button>
        </div>
      ) : null}
      {latestActivity?.kind === "agent_proposed" || latestActivity?.kind === "founder_updated" ? (
        <div className="collaboration-update" role="status" aria-live="polite">
          <span aria-hidden="true">↗</span><div><strong>{activityHeading(latestActivity.kind)}</strong><p>{latestActivity.message}</p></div>
        </div>
      ) : null}
      {error ? <p className="sourcing-error" role="alert">{error}</p> : null}

      {activeStage === "plan" ? (
        <PlanStage ref={stageRef} workspace={workspace} busy={Boolean(busy)} ready={planReady} onUpdate={updateField} onFind={findMatches} />
      ) : null}
      {activeStage === "matches" ? (
        <MatchesStage ref={stageRef} workspace={workspace} busy={Boolean(busy)} onFind={findMatches} onSelect={selectManufacturer} />
      ) : null}
      {activeStage === "contact" && selectedSlug ? (
        <ContactStage
          ref={stageRef}
          workspace={workspace}
          match={selectedMatch}
          draft={selectedDraft}
          inquiry={selectedInquiry}
          busy={Boolean(busy)}
          demoRecipient={demoRecipient}
          emailConfigured={emailConfigured}
          onPrepare={prepareOutreach}
          onApprove={(subject, body, includedFieldKeys) => selectedDraft ? run("Approving your introduction…", () => requestJson(`/api/sourcing/${workspace.id}/outreach/${selectedDraft.id}`, { method: "PATCH", body: JSON.stringify({ subject, body, includedFieldKeys }) })) : Promise.resolve(null)}
          onSend={(draftId, version) => run("Sending your approved introduction…", () => requestJson(`/api/sourcing/${workspace.id}/send`, { method: "POST", body: JSON.stringify({ outreachDraftId: draftId, approvedContentVersion: version }) }))}
        />
      ) : null}
    </>
  );
}

function StageButton({ number, label, active, complete, disabled, onClick }: { number: string; label: string; active: boolean; complete: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" className={active ? "is-active" : ""} disabled={disabled} aria-current={active ? "step" : undefined} onClick={onClick}><span>{complete ? "✓" : number}</span>{label}</button>;
}

const PlanStage = forwardRef<HTMLElement, {
  workspace: Workspace;
  busy: boolean;
  ready: boolean;
  onUpdate: (key: SourcingFieldKey, value: string | null, status: SourcingFieldStatus, share?: boolean) => Promise<Workspace | null>;
  onFind: () => Promise<void>;
}>(function PlanStage({ workspace, busy, ready, onUpdate, onFind }, ref) {
  const question = currentQuestion(workspace, ready);
  return (
    <section ref={ref} tabIndex={-1} className="guided-stage plan-stage" aria-labelledby="plan-stage-heading">
      <div className="guided-main">
        <div className="stage-intro">
          <p className="kicker">Step 1 of 3</p>
          <h2 id="plan-stage-heading">{workspace.fields.product_type.value ? `Got it. You want to create ${sentenceCase(workspace.fields.product_type.value)}.` : "Start with the idea in your head."}</h2>
          <p>{workspace.fields.product_type.value ? "I pulled out what you already shared. We’ll handle the rest one simple decision at a time." : "Tell us what you want to make. You do not need to know the manufacturing terms yet."}</p>
        </div>
        {question ? <CurrentQuestion key={question.key} workspace={workspace} question={question} busy={busy} onUpdate={onUpdate} /> : (
          <div className="plan-ready-card">
            <span aria-hidden="true">✓</span>
            <div><p className="kicker">Ready for the next step</p><h3>Your plan is ready enough to start looking for manufacturers.</h3><p>You can keep filling in details later. For now, we have enough to find a small, useful set of possibilities.</p></div>
            <button className="btn btn-gold" type="button" disabled={busy} onClick={onFind}>Find my best matches</button>
          </div>
        )}
      </div>
      <PlanSummary workspace={workspace} busy={busy} onUpdate={onUpdate} />
    </section>
  );
});

function CurrentQuestion({ workspace, question, busy, onUpdate }: {
  workspace: Workspace;
  question: QuestionDefinition;
  busy: boolean;
  onUpdate: (key: SourcingFieldKey, value: string | null, status: SourcingFieldStatus, share?: boolean) => Promise<Workspace | null>;
}) {
  const field = workspace.fields[question.key];
  const [value, setValue] = useState(field.value ?? "");
  const [editingSuggestion, setEditingSuggestion] = useState(false);

  async function choose(nextValue: string) {
    await onUpdate(question.key, nextValue, "confirmed", FIELD_DEFINITION_BY_KEY[question.key].shareByDefault);
  }

  if (field.status === "proposed" && field.value && !editingSuggestion) {
    return (
      <div className="current-question suggested-question">
        <span className="friendly-status status-proposed">Suggested</span>
        <h3>Does this look right?</h3>
        <p className="suggested-value">{field.value}</p>
        {field.reason ? <p className="question-help">{field.reason}</p> : null}
        <div className="question-actions">
          <button className="btn btn-gold" type="button" disabled={busy} onClick={() => choose(field.value!)}>Yes, keep this</button>
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => setEditingSuggestion(true)}>Choose something else</button>
          <button className="text-button" type="button" disabled={busy} onClick={() => onUpdate(question.key, "I’m not sure yet", "confirmed", false)}>I’m not sure yet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="current-question">
      <p className="question-count">One thing at a time</p>
      <h3>{question.title}</h3>
      <p className="question-help">{question.help}</p>
      {question.options ? (
        <div className="answer-options">
          {question.options.map((option) => <button type="button" key={option} disabled={busy} onClick={() => choose(option)}>{option}<span aria-hidden="true">→</span></button>)}
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); if (value.trim()) void choose(value.trim()); }}>
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={question.placeholder} autoFocus />
          <button className="btn btn-gold" type="submit" disabled={busy || !value.trim()}>Add to my plan</button>
        </form>
      )}
    </div>
  );
}

function PlanSummary({ workspace, busy, onUpdate }: {
  workspace: Workspace;
  busy: boolean;
  onUpdate: (key: SourcingFieldKey, value: string | null, status: SourcingFieldStatus, share?: boolean) => Promise<Workspace | null>;
}) {
  const known = PLAN_SUMMARY_KEYS.map((key) => workspace.fields[key]).filter((field) => field.status === "confirmed" && field.value && !isUnsure(field.value));
  const still = PLAN_SUMMARY_KEYS.map((key) => workspace.fields[key]).filter((field) => field.status === "proposed" || field.status === "needs_decision" || (field.status === "unknown" && importantMissing(field.key))).slice(0, 4);
  return (
    <aside className="plan-summary" aria-labelledby="plan-summary-heading">
      <details className="plan-summary-disclosure" open>
        <summary>View my product plan</summary>
        <div className="plan-summary-content">
          <div className="plan-summary-header"><div><p className="kicker">Updates as you go</p><h2 id="plan-summary-heading">My product plan</h2></div><span>{known.length} detail{known.length === 1 ? "" : "s"}</span></div>
          <section><h3>What we know</h3>{known.length ? <ul>{known.map((field) => <li key={field.key}><span>{friendlyFieldLabel(field.key)}</span><strong>{field.value}</strong></li>)}</ul> : <p>Answer the first question and your plan will start taking shape.</p>}</section>
          <section className="still-figuring"><h3>A few things we still need</h3>{still.length ? <ul>{still.map((field) => <li key={field.key}><span aria-hidden="true">○</span>{friendlyFieldLabel(field.key)}</li>)}</ul> : <p>Nothing important is blocking your first search.</p>}</section>
          <details className="review-details">
            <summary>Review all details</summary>
            <div>{SOURCING_FIELD_DEFINITIONS.map(({ key }) => <ReviewField key={key} field={workspace.fields[key]} busy={busy} onUpdate={onUpdate} />)}</div>
          </details>
        </div>
      </details>
    </aside>
  );
}

function ReviewField({ field, busy, onUpdate }: { field: SourcingField; busy: boolean; onUpdate: (key: SourcingFieldKey, value: string | null, status: SourcingFieldStatus, share?: boolean) => Promise<Workspace | null> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field.value ?? "");
  async function save() {
    await onUpdate(field.key, value, "confirmed", field.shareWithManufacturer || FIELD_DEFINITION_BY_KEY[field.key].shareByDefault);
    setEditing(false);
  }
  return (
    <div className="review-field">
      <div><span>{friendlyFieldLabel(field.key)}</span><strong>{field.value || "Not answered yet"}</strong><small className={`friendly-status status-${field.status}`}>{STATUS_LABELS[field.status]}</small></div>
      {editing ? <div className="review-field-editor"><input value={value} onChange={(event) => setValue(event.target.value)} autoFocus /><button type="button" disabled={busy || !value.trim()} onClick={save}>Save</button><button type="button" onClick={() => setEditing(false)}>Cancel</button></div> : <button type="button" disabled={busy} onClick={() => { setValue(field.value ?? ""); setEditing(true); }}>{field.value ? "Edit" : "Add"}</button>}
    </div>
  );
}

const MatchesStage = forwardRef<HTMLElement, { workspace: Workspace; busy: boolean; onFind: () => Promise<void>; onSelect: (slug: string) => Promise<void> }>(function MatchesStage({ workspace, busy, onFind, onSelect }, ref) {
  return (
    <section ref={ref} tabIndex={-1} className="guided-stage matches-stage" aria-labelledby="matches-stage-heading">
      <div className="stage-intro stage-intro-row"><div><p className="kicker">Step 2 of 3</p><h2 id="matches-stage-heading">Here are the strongest possible matches based on what we know.</h2><p>These are possibilities—not endorsements. Open the evidence before adding someone to your shortlist.</p></div><button className="btn btn-ghost" type="button" disabled={busy} onClick={onFind}>Find my best matches</button></div>
      {workspace.matches.length ? <div className="match-list">{workspace.matches.map((match) => (
        <article key={match.manufacturerSlug} className="match-card">
          <header><div><p className="match-location">{match.location}</p><h3>{match.manufacturerName}</h3></div></header>
          <section className="match-answer"><h4>Why they may fit</h4>{match.supportedMatches.length ? <ul>{match.supportedMatches.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : <p>The product category appears relevant, but other details need confirmation.</p>}</section>
          <section className="match-answer still-ask"><h4>Still need to ask</h4>{match.unknowns.length ? <ul>{match.unknowns.slice(0, 3).map((item) => <li key={item}>{plainUnknown(item)}</li>)}</ul> : <p>No important requested detail is missing from the reviewed record.</p>}</section>
          <details className="evidence-details"><summary>Why this match?</summary><p className="evidence-explainer">The Line List used these reviewed public facts. Missing information is not treated as a “no.”</p><ul>{match.evidence.map((record, index) => <li key={`${record.requirementKey}-${index}`}><span className={`evidence-status evidence-${record.status}`}>{evidenceLabel(record.status)}</span><div><strong>{friendlyFieldLabel(record.requirementKey)}</strong><p>{record.claim}</p><small>Reviewed {record.lastReviewed}{record.notes ? ` · ${record.notes}` : ""}</small></div>{record.sourceUrl ? <a href={record.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a> : null}</li>)}</ul></details>
          <footer><button className="btn btn-gold" type="button" disabled={busy || !match.introductionAvailable} onClick={() => onSelect(match.manufacturerSlug)}>Add to shortlist</button><Link href={`/manufacturers/${match.manufacturerSlug}`}>View profile</Link></footer>
        </article>
      ))}</div> : <div className="sourcing-empty"><strong>No strong matches yet.</strong><p>We will show fewer results instead of padding the list with weak possibilities. Add another product detail, then try again.</p><button className="btn btn-ghost" type="button" onClick={onFind}>Try matching again</button></div>}
    </section>
  );
});

const ContactStage = forwardRef<HTMLElement, {
  workspace: Workspace;
  match: Workspace["matches"][number] | undefined;
  draft: OutreachDraft | undefined;
  inquiry: Workspace["inquiries"][number] | undefined;
  busy: boolean;
  demoRecipient: string | null;
  emailConfigured: boolean;
  onPrepare: () => Promise<void>;
  onApprove: (subject: string, body: string, included: SourcingFieldKey[]) => Promise<Workspace | null>;
  onSend: (draftId: string, version: number) => Promise<Workspace | null>;
}>(function ContactStage({ workspace, match, draft, inquiry, busy, demoRecipient, emailConfigured, onPrepare, onApprove, onSend }, ref) {
  const manufacturerName = match?.manufacturerName || draft?.manufacturerName || inquiry?.manufacturerName || "your manufacturer";
  return (
    <section ref={ref} tabIndex={-1} className="guided-stage contact-stage" aria-labelledby="contact-stage-heading">
      <div className="stage-intro"><p className="kicker">Step 3 of 3</p><h2 id="contact-stage-heading">You chose {manufacturerName}. Let’s prepare your introduction.</h2><p>Review the message and exactly what will be shared. Nothing is sent without your approval.</p></div>
      {!draft ? <div className="prepare-outreach-card"><div><strong>Start with a personalized draft</strong><p>We’ll use only confirmed details and supported manufacturer facts. This step does not send anything.</p></div><button className="btn btn-gold" type="button" disabled={busy} onClick={onPrepare}>Draft my introduction</button></div> : <OutreachEditor workspace={workspace} draft={draft} inquiry={inquiry} busy={busy} demoRecipient={demoRecipient} emailConfigured={emailConfigured} onApprove={onApprove} onSend={onSend} />}
    </section>
  );
});

function OutreachEditor({ workspace, draft, inquiry, busy, demoRecipient, emailConfigured, onApprove, onSend }: {
  workspace: Workspace;
  draft: OutreachDraft;
  inquiry: Workspace["inquiries"][number] | undefined;
  busy: boolean;
  demoRecipient: string | null;
  emailConfigured: boolean;
  onApprove: (subject: string, body: string, included: SourcingFieldKey[]) => Promise<Workspace | null>;
  onSend: (draftId: string, version: number) => Promise<Workspace | null>;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [included, setIncluded] = useState<SourcingFieldKey[]>(draft.includedFieldKeys);
  const confirmedFields = useMemo(() => SOURCING_FIELD_DEFINITIONS.filter(({ key }) => workspace.fields[key].status === "confirmed" && workspace.fields[key].value && !NEVER_SHARE_FIELD_KEYS.has(key)), [workspace]);
  const dirty = subject !== draft.subject || body !== draft.body || [...included].sort().join() !== [...draft.includedFieldKeys].sort().join();
  const deliveryReady = Boolean(demoRecipient && emailConfigured);
  const approved = draft.approvedVersion === draft.version && !dirty;

  function toggle(key: SourcingFieldKey, checked: boolean) {
    setIncluded((current) => checked ? [...new Set([...current, key])] : current.filter((candidate) => candidate !== key));
  }

  async function approveOrSend() {
    let approvedDraft = draft;
    if (dirty || draft.approvedVersion !== draft.version) {
      const next = await onApprove(subject, body, included);
      const updated = next?.outreachDrafts.find((candidate) => candidate.id === draft.id);
      if (!updated) return;
      approvedDraft = updated;
    }
    if (deliveryReady) await onSend(approvedDraft.id, approvedDraft.version);
  }

  if (inquiry) {
    return <div className="introduction-sent"><span aria-hidden="true">✓</span><div><p className="kicker">Introduction sent</p><h3>{draft.manufacturerName}</h3><p>Delivered to the safe demo inbox on {formatDate(inquiry.contactedAt)}.</p><Link href={`/packet/${draft.packet.token}`} target="_blank">Open the product brief ↗</Link><small>Next: watch the safe inbox and prepare for the manufacturer’s questions.</small></div></div>;
  }

  return (
    <div className="outreach-editor">
      <div className={`demo-delivery-banner${deliveryReady ? " is-ready" : ""}`} role="note"><strong>{deliveryReady ? "Safe demo delivery is ready" : "Sending is not configured yet"}</strong><p>{deliveryReady ? <>Your introduction for {draft.manufacturerName} will go only to <b>{demoRecipient}</b>.</> : "You can review and approve everything now. Nothing can be sent until the safe demo inbox is configured."}</p></div>
      <div className="outreach-grid">
        <section className="message-editor" aria-labelledby="message-editor-heading"><p className="kicker">Your introduction</p><h3 id="message-editor-heading">Message for {draft.manufacturerName}</h3><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label>Message<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={15} /></label></section>
        <aside className="share-preview" aria-labelledby="share-preview-heading"><p className="kicker">Product brief</p><h3 id="share-preview-heading">What the manufacturer will see</h3><ul className="shared-field-list">{confirmedFields.map(({ key }) => <li key={key}><label><input type="checkbox" checked={included.includes(key)} onChange={(event) => toggle(key, event.target.checked)} /><span><strong>{friendlyFieldLabel(key)}</strong><small>{workspace.fields[key].value}</small></span></label></li>)}</ul><h4>Staying private</h4><ul className="excluded-list"><li>Internal notes</li><li>Manufacturer rankings and comparisons</li><li>Private concerns</li><li>Anything ChatGPT suggested that you did not confirm</li>{!included.includes("budget") && workspace.fields.budget.value ? <li>Budget</li> : null}</ul><Link className="packet-preview-link" href={`/packet/${draft.packet.token}`} target="_blank">Preview product brief ↗</Link></aside>
      </div>
      {draft.warnings.length ? <details className="outreach-warnings"><summary>A few things you may still want to answer</summary><ul>{draft.warnings.map((warning) => <li key={warning}>{plainWarning(warning)}</li>)}</ul></details> : null}
      <div className="approval-actions"><div><strong>{approved ? "Introduction approved" : "Nothing is sent without your approval."}</strong><p>{approved ? "This exact message and product brief are approved." : "Changing the message or shared details means you will approve it again."}</p></div><button className="btn btn-gold" type="button" disabled={busy || !subject.trim() || !body.trim() || (approved && !deliveryReady)} onClick={approveOrSend}>{approved && !deliveryReady ? "Introduction approved" : deliveryReady ? "Approve and send introduction" : "Approve introduction"}</button></div>
    </div>
  );
}

function currentQuestion(workspace: Workspace, ready: boolean): QuestionDefinition | null {
  const proposed = QUESTIONS.find(({ key }) => workspace.fields[key].status === "proposed");
  if (proposed) return proposed;
  if (ready) return null;
  return QUESTIONS.find(({ key }) => {
    const field = workspace.fields[key];
    return field.status !== "confirmed" && field.status !== "rejected";
  }) ?? null;
}

function friendlyFieldLabel(key: SourcingFieldKey): string {
  const overrides: Partial<Record<SourcingFieldKey, string>> = {
    formula_status: "Recipe readiness",
    formulation_assistance: "Recipe help",
    production_volume: "First production amount",
    preferred_geography: "Manufacturer location",
    manufacturer_information: "What the manufacturer will see",
  };
  return overrides[key] ?? FIELD_DEFINITION_BY_KEY[key].label;
}

function importantMissing(key: SourcingFieldKey): boolean {
  return ["product_type", "packaging_format", "formula_status", "production_volume"].includes(key);
}

function isUnsure(value: string): boolean { return /not sure/i.test(value); }
function sentenceCase(value: string): string { return `${value.charAt(0).toLowerCase()}${value.slice(1)}`; }
function plainUnknown(value: string): string { return value.replace(/ is not publicly listed\.?$/i, " needs to be confirmed.").replace(/^The current minimum is not publicly listed\.?$/i, "Their current minimum production amount needs to be confirmed."); }
function plainWarning(value: string): string { return value.replace("Initial production volume", "First production amount").replace("Formula status", "Recipe readiness").replace(/agent proposal/gi, "ChatGPT suggestion"); }
function evidenceLabel(status: string): string { return ({ verified: "Confirmed by a reviewed source", publicly_listed: "Publicly listed", unknown: "We could not find this", not_publicly_listed: "We could not find this", conflicting: "Information conflicts" } as Record<string, string>)[status] ?? status; }
function activityHeading(kind: Workspace["activity"][number]["kind"]): string { return kind === "agent_proposed" ? "Your plan changed" : "You confirmed a detail"; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
