"use client";

import { ArrowLeft, ArrowRight, Bread, Check, FileText, Info, PaperPlaneTilt } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { comparisonHref } from "@/components/compare/CompareButton";
import { FIELD_DEFINITION_BY_KEY } from "@/lib/sourcing/fields";
import { getPackageDesignPresentation } from "@/lib/sourcing/package-presentation";
import { getProductIdentity } from "@/lib/sourcing/product-identity";
import { getSourcingReadiness } from "@/lib/sourcing/readiness";
import { formatReviewedDate } from "@/lib/sourcing/date-format";
import { MATCHABLE_REQUIREMENT_KEYS } from "@/lib/sourcing/matching-requirements";
import { normalizeCertificationRequirements } from "@/lib/sourcing/certification-requirements";
import type { ManufacturerResearchRequest, OutreachDraft, SourcingWorkspace as Workspace } from "@/lib/sourcing/types";
import { routeFocusKey, useSourcingWorkspace } from "./SourcingWorkspaceContext";

const SELECTION_LIMIT = 3;

export function SourcingManufacturers() {
  const { workspace, busy, setBusy, error, setError, setAgentNote, acceptWorkspace } = useSourcingWorkspace();
  const readiness = useMemo(() => getSourcingReadiness(workspace), [workspace]);
  const selectedSet = useMemo(() => new Set(workspace.selectedManufacturerSlugs), [workspace.selectedManufacturerSlugs]);
  const drafts = useMemo(() => latestDrafts(workspace.outreachDrafts).filter((draft) => selectedSet.has(draft.manufacturerSlug)), [selectedSet, workspace.outreachDrafts]);
  const [activeSlug, setActiveSlug] = useState(() => workspace.selectedManufacturerSlugs.find((slug) => workspace.matches.some((match) => match.manufacturerSlug === slug)) ?? workspace.matches[0]?.manufacturerSlug ?? null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [reviewingBroadening, setReviewingBroadening] = useState(false);
  const resolvedActiveSlug = activeSlug && workspace.matches.some((match) => match.manufacturerSlug === activeSlug)
    ? activeSlug
    : workspace.selectedManufacturerSlugs.find((slug) => workspace.matches.some((match) => match.manufacturerSlug === slug)) ?? workspace.matches[0]?.manufacturerSlug ?? null;
  const activeMatch = workspace.matches.find((match) => match.manufacturerSlug === resolvedActiveSlug) ?? null;
  const { productDescriptor } = getProductIdentity(workspace);
  const packagePresentation = workspace.packageDesign ? getPackageDesignPresentation(workspace.packageDesign, workspace.artwork) : null;
  const remainingBriefCopy = readiness.manufacturerMissing.length
    ? `Finish ${readiness.manufacturerMissing.length} manufacturer-brief decision${readiness.manufacturerMissing.length === 1 ? "" : "s"} before preparing introductions.`
    : readiness.proposedRequirements.length
      ? `Review ${readiness.proposedRequirements.length} agent proposal${readiness.proposedRequirements.length === 1 ? "" : "s"} before preparing introductions.`
      : "Review the product brief before preparing introductions.";
  const briefActionLabel = readiness.manufacturerMissing.length ? "Finish product brief" : "Review product brief";
  const currentResearch = workspace.manufacturerResearch?.status === "current" ? workspace.manufacturerResearch : null;
  const broaderRequest = currentResearch?.candidateCount === 0 ? broadenResearchRequest(currentResearch.request) : null;

  useEffect(() => {
    const focusKey = routeFocusKey(workspace.id);
    const requestedFocus = window.sessionStorage.getItem(focusKey);
    if (requestedFocus !== "manufacturer-results") return;
    window.sessionStorage.removeItem(focusKey);
    const heading = document.getElementById("manufacturer-possibilities-heading");
    if (heading instanceof HTMLElement) window.requestAnimationFrame(() => heading.focus());
  }, [workspace.id]);

  useEffect(() => {
    if (window.location.hash !== "#manufacturer-introductions") return;
    window.sessionStorage.removeItem(routeFocusKey(workspace.id));
    const heading = document.getElementById("manufacturer-introductions-heading");
    if (heading instanceof HTMLElement) window.requestAnimationFrame(() => heading.focus());
  }, [drafts.length, workspace.id]);

  async function research(request = initialResearchRequest(workspace), founderBroadeningApproval?: {
    mutationId: string;
    originalRequest: ManufacturerResearchRequest;
    broadenedRequest: ManufacturerResearchRequest;
  }) {
    setBusy("match");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}/match`, {
      method: "POST",
      body: JSON.stringify({ ...request, ...(founderBroadeningApproval ? { founderBroadeningApproval } : {}) }),
    });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error);
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setActiveSlug(response.workspace.selectedManufacturerSlugs[0] ?? response.workspace.matches[0]?.manufacturerSlug ?? null);
      setAgentNote(response.workspace.matches.length
        ? `I found ${response.workspace.matches.length} evidence-backed possibilities. Unsupported capabilities remain visibly unconfirmed.`
        : "The current evidence did not produce a responsible manufacturer possibility. I did not add weaker results to fill the list.");
      setReviewingBroadening(false);
    } else {
      setError("Manufacturer possibilities could not be prepared.");
    }
    setBusy(null);
  }

  async function confirmBroadening() {
    if (!currentResearch || !broaderRequest) return;
    await research(broaderRequest, {
      mutationId: createMutationId(),
      originalRequest: currentResearch.request,
      broadenedRequest: broaderRequest,
    });
  }

  async function toggleManufacturer(slug: string) {
    const selected = selectedSet.has(slug);
    if (!selected && selectedSet.size >= SELECTION_LIMIT) {
      setError(`You can select up to ${SELECTION_LIMIT} manufacturers. Remove one before choosing another.`);
      return;
    }
    setBusy("select");
    setError("");
    const next = selected ? workspace.selectedManufacturerSlugs.filter((item) => item !== slug) : [...workspace.selectedManufacturerSlugs, slug];
    const response = await workspaceApi(`/api/sourcing/${workspace.id}`, {
      method: "PATCH",
      body: JSON.stringify({ revision: workspace.revision, selectedManufacturerSlugs: next }),
    });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error);
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setAgentNote(selected ? "I removed that manufacturer from your shortlist." : "I added that manufacturer to your shortlist. Nothing has been contacted.");
    }
    setBusy(null);
  }

  async function prepareIntroductions() {
    if (!workspace.selectedManufacturerSlugs.length) return;
    setBusy("outreach");
    setError("");
    const response = await workspaceApi(`/api/sourcing/${workspace.id}/outreach`, {
      method: "POST",
      body: JSON.stringify({ selectedManufacturerIds: workspace.selectedManufacturerSlugs }),
    });
    if (response.error) {
      if (response.workspace) acceptWorkspace(response.workspace);
      setError(response.error);
    } else if (response.workspace) {
      acceptWorkspace(response.workspace);
      setAgentNote(`${response.workspace.selectedManufacturerSlugs.length} introduction draft${response.workspace.selectedManufacturerSlugs.length === 1 ? " is" : "s are"} ready for your exact-message review. Nothing has been sent.`);
      window.requestAnimationFrame(() => {
        const heading = document.getElementById("manufacturer-introductions-heading");
        heading?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
      });
    }
    setBusy(null);
  }

  const packagingContext = packagePresentation?.direction
    ?? (workspace.fields.packaging_format.status === "proposed" && workspace.fields.packaging_format.value
      ? `Suggested: ${workspace.fields.packaging_format.value}`
      : workspace.fields.packaging_format.status === "confirmed" && workspace.fields.packaging_format.value
        ? workspace.fields.packaging_format.value
        : "Package direction open");

  return (
    <div className={`manufacturer-workspace${mobileDetailOpen ? " mobile-detail-open" : ""}`}>
      <ContextBar
        product={workspace.fields.product_category.value || productDescriptor}
        packaging={packagingContext}
        channel={workspace.fields.retail_channel.value || "Retail channel open"}
        briefHref={`/sourcing/${workspace.id}`}
      />

      <header className="manufacturer-page-head">
        <h1 id="manufacturer-possibilities-heading" tabIndex={-1}>Manufacturer possibilities</h1>
        <p>These are possibilities to investigate. Missing public evidence is not treated as a match, and possible conflicts stay separate from unknowns.</p>
      </header>

      {currentResearch?.broadeningApproval ? (
        <p className="manufacturer-broadening-indicator" role="status">
          Broadened search approved · {formatReviewedDate(currentResearch.broadeningApproval.approvedAt)} · original and broader criteria saved
        </p>
      ) : null}

      {error ? <p className="sourcing-error manufacturer-error" role="alert">{error}</p> : null}

      {workspace.matches.length ? (
        <section className="manufacturer-browser" aria-labelledby="manufacturer-possibilities-heading">
          <aside className="manufacturer-index" aria-label="Manufacturer possibilities">
            <div className="manufacturer-index-label">Up to {SELECTION_LIMIT} can be selected</div>
            <ul>
              {workspace.matches.map((match) => {
                const isActive = activeMatch?.manufacturerSlug === match.manufacturerSlug;
                const isSelected = selectedSet.has(match.manufacturerSlug);
                return (
                  <li key={match.manufacturerSlug} className={`manufacturer-index-item${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}>
                    <button
                      type="button"
                      aria-label={`View details for ${match.manufacturerName}`}
                      onClick={() => { setActiveSlug(match.manufacturerSlug); setMobileDetailOpen(true); }}
                    >
                      <span className="manufacturer-index-marker" aria-hidden="true">{isSelected ? <Check weight="bold" /> : null}</span>
                      <span><strong>{match.manufacturerName}</strong><small>{match.location}</small></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {activeMatch ? (
            <article className="manufacturer-detail" role="region" aria-labelledby={`manufacturer-detail-${activeMatch.manufacturerSlug}`}>
              <button className="manufacturer-mobile-back" type="button" onClick={() => setMobileDetailOpen(false)}><ArrowLeft aria-hidden="true" /> All possibilities</button>
              <header className="manufacturer-detail-head">
                <div>
                  <h2 id={`manufacturer-detail-${activeMatch.manufacturerSlug}`} tabIndex={-1}>{activeMatch.manufacturerName}</h2>
                  <p>{activeMatch.location}</p>
                </div>
                <button
                  type="button"
                  className="manufacturer-select-control"
                  aria-pressed={selectedSet.has(activeMatch.manufacturerSlug)}
                  aria-label={selectedSet.has(activeMatch.manufacturerSlug) ? `Remove ${activeMatch.manufacturerName} from selected manufacturers` : `Select ${activeMatch.manufacturerName}`}
                  onClick={() => void toggleManufacturer(activeMatch.manufacturerSlug)}
                  disabled={busy !== null || (!selectedSet.has(activeMatch.manufacturerSlug) && selectedSet.size >= SELECTION_LIMIT)}
                >
                  {selectedSet.has(activeMatch.manufacturerSlug) ? <><Check aria-hidden="true" weight="bold" /> Selected</> : selectedSet.size >= SELECTION_LIMIT ? "Limit reached" : "Select"}
                </button>
              </header>

              <section className="manufacturer-why">
                <h3>Why it appears</h3>
                <p>{activeMatch.fitExplanation}</p>
                {activeMatch.reasonTrace?.length ? (
                  <ul className="manufacturer-reason-trace" aria-label="Requirement trace">
                    {activeMatch.reasonTrace.map((item, index) => (
                      <li key={`${item.requirementKey}-${index}`}>
                        <span>{item.requirementLabel}</span>
                        <small>{item.priority} · {item.outcome.replaceAll("_", " ")}</small>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <div className="manufacturer-evidence-summary">
                <EvidenceList title="Supported by sources" items={activeMatch.supportedMatches} empty="No required capability is treated as proven yet." />
                <div>
                  {activeMatch.possibleConflicts.length ? <EvidenceList title="Possible conflicts" items={activeMatch.possibleConflicts} /> : null}
                  <EvidenceList title="Not publicly confirmed" items={activeMatch.unknowns.slice(0, 6)} empty="No evaluated requirement is currently marked unknown." />
                </div>
              </div>

              {readiness.manufacturerMissing.length ? (
                <div className="manufacturer-detail-notice">
                  <Info aria-hidden="true" weight="fill" />
                  <span>{readiness.manufacturerMissing.length} brief decision{readiness.manufacturerMissing.length === 1 ? " would" : "s would"} narrow these results.</span>
                  <Link href={`/sourcing/${workspace.id}#next-question-heading`} prefetch={false}>Update product brief <span aria-hidden="true">↗</span></Link>
                </div>
              ) : null}

              <details className="manufacturer-source-review">
                <summary><FileText aria-hidden="true" /> Review source evidence</summary>
                <div className="manufacturer-source-grid">
                  {activeMatch.evidence.map((item, index) => (
                    <article className="manufacturer-source-line" key={`${item.requirementKey}-${index}`}>
                      <span>{item.status.replaceAll("_", " ")}</span>
                      <h4>{item.requirementLabel}</h4>
                      <p>{item.claim}</p>
                      {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel || "Open source"} <span aria-hidden="true">↗</span></a> : <small>No public source found</small>}
                      <small>Reviewed {formatReviewedDate(item.lastReviewed)}{item.notes ? ` · ${item.notes}` : ""}</small>
                    </article>
                  ))}
                </div>
              </details>

              <Link className="manufacturer-profile-link" href={`/manufacturers/${activeMatch.manufacturerSlug}`}>View directory profile <span aria-hidden="true">↗</span></Link>

              <footer className="manufacturer-action-bar">
                <div role="status" aria-live="polite"><strong>{workspace.selectedManufacturerSlugs.length} selected</strong><small>Select up to {SELECTION_LIMIT} possibilities to compare.</small></div>
                {workspace.selectedManufacturerSlugs.length ? <Link className="manufacturer-compare-button" href={comparisonHref(workspace.selectedManufacturerSlugs)}>Compare selected <ArrowRight aria-hidden="true" /></Link> : <button className="manufacturer-compare-button" type="button" disabled>Compare selected <ArrowRight aria-hidden="true" /></button>}
              </footer>
            </article>
          ) : null}
        </section>
      ) : (
        <section className="manufacturer-empty" aria-labelledby="manufacturer-empty-heading">
          <p className="manufacturer-eyebrow">{workspace.matchesUpdatedAt ? "Research complete" : "Start with the brief"}</p>
          <h2 id="manufacturer-empty-heading">{workspace.matchesUpdatedAt ? "No evidence-backed possibilities yet" : "Research the current product direction"}</h2>
          <p>{workspace.matchesUpdatedAt
            ? "The current requirements did not produce a responsible match. We did not add weaker manufacturers just to fill the list. Review the brief or research again after visibly adjusting a preference."
            : "We’ll show public evidence, open questions, and possible conflicts without treating missing information as proof."}</p>
          {workspace.matchesUpdatedAt
            ? broaderRequest && !currentResearch?.broadeningApproval
              ? <button type="button" onClick={() => setReviewingBroadening(true)} disabled={busy !== null}>Review broader search</button>
              : null
            : <button type="button" onClick={() => void research()} disabled={busy !== null}>{busy === "match" ? "Researching…" : "Research manufacturers"}</button>}
          {workspace.matchesUpdatedAt ? <Link href={`/sourcing/${workspace.id}#next-question-heading`} prefetch={false}>Review product brief <span aria-hidden="true">↗</span></Link> : null}
        </section>
      )}

      {reviewingBroadening && currentResearch && broaderRequest ? (
        <dialog className="manufacturer-broadening-dialog" aria-labelledby="broader-search-heading" open onCancel={() => setReviewingBroadening(false)}>
          <div>
            <p className="manufacturer-eyebrow">Founder approval</p>
            <h2 id="broader-search-heading">Review broader search</h2>
            <p>This changes only the research criteria. Your confirmed product brief stays unchanged, and unsupported details will remain unknown.</p>
            <CriteriaDiff before={currentResearch.request} after={broaderRequest} />
            <footer>
              <button type="button" onClick={() => void confirmBroadening()} disabled={busy !== null}>{busy === "match" ? "Researching…" : "Confirm broader search"}</button>
              <button className="secondary-button" type="button" onClick={() => setReviewingBroadening(false)} disabled={busy !== null}>Cancel</button>
            </footer>
          </div>
        </dialog>
      ) : null}

      {workspace.matches.length ? (
        <section className="manufacturer-next-actions" aria-labelledby="manufacturer-next-actions-heading">
          <div><p className="manufacturer-eyebrow">Final step</p><h2 id="manufacturer-next-actions-heading">{drafts.length ? "Introductions are ready for your review" : "Get introductions ready"}</h2><p>{readiness.manufacturerReady ? "Your agent prepares the exact drafts. You review and approve each version, then you decide whether to send it." : remainingBriefCopy}</p>{drafts.length ? null : <IntroductionSequence drafts={drafts} />}</div>
          {readiness.manufacturerReady && workspace.selectedManufacturerSlugs.length ? <button type="button" onClick={() => void prepareIntroductions()} disabled={busy !== null}>{busy === "outreach" ? "Preparing drafts…" : drafts.length ? "Prepare fresh drafts" : `Prepare ${workspace.selectedManufacturerSlugs.length} introduction${workspace.selectedManufacturerSlugs.length === 1 ? "" : "s"}`} <ArrowRight aria-hidden="true" /></button> : <Link href={`/sourcing/${workspace.id}${readiness.manufacturerMissing.length ? "#next-question-heading" : ""}`} prefetch={false}>{briefActionLabel} <ArrowRight aria-hidden="true" /></Link>}
        </section>
      ) : null}

      {drafts.length ? (
        <section id="manufacturer-introductions" className="introduction-section manufacturer-introductions" aria-labelledby="manufacturer-introductions-heading">
          <p className="manufacturer-eyebrow">Exact-message review</p>
          <h2 id="manufacturer-introductions-heading" tabIndex={-1}>Introduction drafts</h2>
          <p>Nothing is sent until you approve an exact version and confirm the separate send step.</p>
          <IntroductionSequence drafts={drafts} />
          <div className="introduction-list">{drafts.map((draft) => <DraftReview key={draft.id} draft={draft} workspace={workspace} onWorkspace={acceptWorkspace} />)}</div>
        </section>
      ) : null}
    </div>
  );
}

function ContextBar({ product, packaging, channel, briefHref }: { product: string; packaging: string; channel: string; briefHref: string }) {
  return (
    <div className="manufacturer-context-bar">
      <div className="manufacturer-context-summary" aria-label="Product context"><Bread aria-hidden="true" /><div><span>{product}</span><i aria-hidden="true">·</i><span>{packaging}</span><i aria-hidden="true">·</i><span>{channel}</span></div></div>
      <Link href={briefHref} prefetch={false}>Review product brief <span aria-hidden="true">↗</span></Link>
    </div>
  );
}

function EvidenceList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return <section><h3>{title}</h3><ul>{items.length ? items.map((item) => <li key={item}>{item}</li>) : empty ? <li>{empty}</li> : null}</ul></section>;
}

function CriteriaDiff({ before, after }: { before: ManufacturerResearchRequest; after: ManufacturerResearchRequest }) {
  const rows = [
    { label: "Required", before: criterionLabels(before.requiredRequirements), after: criterionLabels(after.requiredRequirements) },
    { label: "Preferred", before: criterionLabels(before.preferredRequirements), after: criterionLabels(after.preferredRequirements) },
    { label: "Geography", before: before.geographyPreference || "No separate override", after: after.geographyPreference || "No separate override" },
    { label: "Maximum results", before: String(before.resultLimit), after: String(after.resultLimit) },
  ];
  return <div className="manufacturer-criteria-diff" aria-label="Exact research criteria change">{rows.map((row) => <section key={row.label}><h3>{row.label}</h3><div><span>Before</span><p>{row.before}</p></div><div><span>After</span><p>{row.after}</p></div></section>)}</div>;
}

function criterionLabels(keys: ManufacturerResearchRequest["requiredRequirements"]): string {
  return keys.length ? keys.map((key) => FIELD_DEFINITION_BY_KEY[key].label).join(", ") : "None";
}

function initialResearchRequest(workspace: Workspace): ManufacturerResearchRequest {
  const preferredRequirements = MATCHABLE_REQUIREMENT_KEYS.filter((key) => {
    if (key === "product_type" || workspace.fields[key].status !== "confirmed" || !workspace.fields[key].value) return false;
    if (key !== "certifications") return true;
    const certifications = normalizeCertificationRequirements(workspace.fields.certifications.value);
    return certifications.required.length > 0 || certifications.preferred.length > 0;
  });
  return {
    geographyPreference: null,
    resultLimit: 3,
    requiredRequirements: ["product_type"],
    preferredRequirements,
  };
}

function broadenResearchRequest(request: ManufacturerResearchRequest): ManufacturerResearchRequest | null {
  if (!request.requiredRequirements.length) return null;
  return {
    ...request,
    requiredRequirements: [],
    preferredRequirements: [...new Set([...request.preferredRequirements, ...request.requiredRequirements])].sort(),
  };
}

function createMutationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function IntroductionSequence({ drafts }: { drafts: OutreachDraft[] }) {
  const prepared = drafts.length > 0;
  const approved = prepared && drafts.every((draft) => draft.approvedVersion === draft.version && Boolean(draft.approvedAt));
  const sent = prepared && drafts.every((draft) => draft.deliveryStatus === "sent");
  const steps = [
    { label: "Agent prepares drafts", complete: prepared, owner: "Agent" },
    { label: "You review and approve", complete: approved, owner: "Human" },
    { label: "You confirm Send now", complete: sent, owner: "Human" },
  ];
  return <ol className="introduction-sequence" aria-label="Introduction approval steps">{steps.map((step, index) => <li key={step.label} className={step.complete ? "is-complete" : ""}><span aria-hidden="true">{step.complete ? "✓" : index + 1}</span><div><strong>{step.label}</strong><small>{step.owner}</small></div></li>)}</ol>;
}

function DraftReview({ draft, workspace, onWorkspace }: { draft: OutreachDraft; workspace: Workspace; onWorkspace: (workspace: Workspace) => void }) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [localError, setLocalError] = useState("");
  const approved = draft.approvedVersion === draft.version && Boolean(draft.approvedAt);
  const sent = draft.deliveryStatus === "sent" && Boolean(draft.sentAt);

  async function approve() {
    setBusy(true);
    setLocalError("");
    try {
      const response = await workspaceApi(`/api/sourcing/${workspace.id}/outreach/${draft.id}`, { method: "PATCH", body: JSON.stringify({ subject: subjectRef.current?.value ?? draft.subject, body: bodyRef.current?.value ?? draft.body, includedFieldKeys: draft.includedFieldKeys }) });
      if (response.workspace) onWorkspace(response.workspace);
      if (response.error) setLocalError(response.error);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setLocalError("");
    try {
      const response = await workspaceApi(`/api/sourcing/${workspace.id}/outreach/${draft.id}/send`, { method: "POST" });
      if (response.workspace) onWorkspace(response.workspace);
      if (response.error) setLocalError(response.error);
      else setConfirmingSend(false);
    } finally {
      setBusy(false);
    }
  }

  const stateLabel = sent ? "Sent" : draft.deliveryStatus === "failed" ? "Needs retry · not sent" : approved ? "Approved · not sent" : "Draft · not sent";
  return (
    <article className="introduction-card">
      <header><div><span>To</span><h3>{draft.manufacturerName}</h3>{draft.recipientEmail ? <p className="recipient-email">{draft.recipientEmail}</p> : <p className="recipient-email recipient-unavailable">No sourced public email available</p>}</div><span className={approved || sent ? "approved-state" : "draft-state"}>{stateLabel}</span></header>
      <div className="delivery-preview"><span>From The Line List</span><span>Reply-to and copy: {draft.founderCopyEmail || workspace.fields.contact_email.value || "Add your confirmed email"}</span></div>
      {draft.warnings.length ? <div className="introduction-error introduction-warning-early" role="status"><strong>Before you approve</strong><ul>{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
      <label>Subject<input ref={subjectRef} defaultValue={draft.subject} maxLength={180} readOnly={approved || sent} /></label>
      <label>Message<textarea ref={bodyRef} defaultValue={draft.body} rows={10} maxLength={12_000} readOnly={approved || sent} /></label>
      <details><summary>{draft.includedFieldKeys.length} product details included in this packet snapshot</summary><ul>{draft.includedFieldKeys.map((key) => <li key={key}><strong>{FIELD_DEFINITION_BY_KEY[key].label}</strong><span>{draft.packet.fieldValues[key] || "Not included in this packet snapshot"}</span></li>)}</ul></details>
      {localError || draft.deliveryError ? <p className="introduction-error" role="alert">{localError || "The last delivery attempt failed. Review the email setup and try again."}</p> : null}
      <footer>
        {sent ? <><p>Sent by you through The Line List on {new Date(draft.sentAt!).toLocaleString()}.</p><Link href={`/manufacturers/${draft.manufacturerSlug}`}>Open manufacturer profile <span aria-hidden="true">↗</span></Link></>
          : approved ? confirmingSend ? <><p><strong>This will email {draft.recipientEmail || draft.manufacturerName} now.</strong> You will be copied, and replies will go directly to you.</p><button type="button" onClick={send} disabled={busy || !draft.recipientEmail || !draft.founderCopyEmail}><PaperPlaneTilt aria-hidden="true" /> {busy ? "Sending…" : "Send now"}</button><button className="secondary-button" type="button" onClick={() => setConfirmingSend(false)} disabled={busy}>Cancel</button></>
            : <><p>Approved. Nothing has been sent yet; the next click opens a final send confirmation.</p><button type="button" onClick={() => setConfirmingSend(true)} disabled={!draft.recipientEmail || !draft.founderCopyEmail}><PaperPlaneTilt aria-hidden="true" /> {draft.deliveryStatus === "failed" ? "Retry introduction" : "Send introduction"}</button><Link href={`/manufacturers/${draft.manufacturerSlug}`}>Open manufacturer profile <span aria-hidden="true">↗</span></Link></>
          : <><p>Review and approve this exact version. Approval alone never sends email.</p><button type="button" onClick={approve} disabled={busy}>{busy ? "Approving…" : "Approve this introduction"}</button></>}
      </footer>
    </article>
  );
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

function latestDrafts(drafts: OutreachDraft[]): OutreachDraft[] {
  const found = new Map<string, OutreachDraft>();
  for (const draft of drafts) if (!found.has(draft.manufacturerSlug)) found.set(draft.manufacturerSlug, draft);
  return [...found.values()];
}
