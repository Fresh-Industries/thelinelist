"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { PRODUCT_CATEGORIES, queryToSearchParams, stateLabel, type CertificationFilter, type DirectoryQuery, type FinderProcess, type PackagingFilter, type ProductCategorySlug } from "@/lib/directory";
import { parseUtmSearch } from "@/lib/utm";
import { useEffect, useRef, useState } from "react";

const PROCESS_CHOICES: { value: FinderProcess; label: string; help: string }[] = [
  { value: "hot-fill", label: "Hot fill", help: "Often discussed for acidified sauces and some shelf-stable beverages." },
  { value: "hpp", label: "HPP", help: "A high-pressure process used for some refrigerated products. Cold pressed is not the same as HPP." },
  { value: "retort", label: "Retort", help: "A pressure heat process used for some low-acid shelf-stable foods." },
  { value: "cold-fill", label: "Cold fill", help: "Filled without a hot-fill step. The safety process and storage plan still need to be confirmed." },
  { value: "acidified", label: "Acidified", help: "A low-acid food adjusted to a controlled finished pH, common for some sauces and condiments." },
];

const STEP_TITLES = [
  "What do you want to make?",
  "Do you have a package in mind?",
  "Anything else to narrow your search?",
] as const;

function preserveCampaign(params: URLSearchParams) {
  if (typeof window === "undefined") return;
  // The shared UTM parser allows only source, medium, campaign, content, and term.
  for (const [key, value] of Object.entries(parseUtmSearch(window.location.search))) {
    if (value) params.set(`utm_${key}`, value);
  }
}

export function MatchingWizard({ states, initialQuery = {}, initialStep = 1, initialUnsure = false }: {
  states: string[];
  initialQuery?: DirectoryQuery;
  initialStep?: number;
  initialUnsure?: boolean;
}) {
  const [step, setStep] = useState(initialStep);
  const [product, setProduct] = useState<ProductCategorySlug | "">(initialQuery.category ?? "");
  const [productAnswered, setProductAnswered] = useState(Boolean(initialQuery.category) || initialUnsure);
  const [packaging, setPackaging] = useState<PackagingFilter | "">(initialQuery.packaging ?? "");
  const [process, setProcess] = useState<FinderProcess | "">(initialQuery.process ?? "");
  const [state, setState] = useState(initialQuery.state ?? "");
  const [certification, setCertification] = useState<CertificationFilter | "">(initialQuery.certification ?? "");
  const [smallRunSignal, setSmallRunSignal] = useState(Boolean(initialQuery.smallRunSignal));
  const [validationError, setValidationError] = useState("");
  const [navigationError, setNavigationError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const priorStep = useRef(step);

  useEffect(() => {
    track(ANALYTICS_EVENTS.wizard_started, { initialProduct: initialQuery.category || "none" });
  }, [initialQuery.category]);

  useEffect(() => {
    function resetNavigation() { setIsPending(false); }
    window.addEventListener("pageshow", resetNavigation);
    return () => window.removeEventListener("pageshow", resetNavigation);
  }, []);

  // Keep public directory filters recoverable on reload and return from results.
  useEffect(() => {
    const params = queryToSearchParams({ category: product || undefined, packaging: packaging || undefined, process: process || undefined, state: state || undefined, certification: certification || undefined, smallRunSignal });
    if (productAnswered && !product) params.set("unsure", "1");
    if (step > 1) params.set("step", String(step));
    preserveCampaign(params);
    const search = params.toString();
    const destination = `/find-manufacturers/wizard${search ? `?${search}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== destination) window.history.replaceState(null, "", destination);
  }, [product, productAnswered, packaging, process, state, certification, smallRunSignal, step]);

  useEffect(() => {
    if (priorStep.current === step) return;
    priorStep.current = step;
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  function chooseProduct(value: ProductCategorySlug | "") {
    setProduct(value);
    setProductAnswered(true);
    setValidationError("");
    track(ANALYTICS_EVENTS.product_selected, { product: value || "unsure", source: "wizard" });
  }

  function next() {
    if (step === 1 && !productAnswered) {
      setValidationError("Choose the closest product, or select “I’m not sure yet.”");
      return;
    }
    setValidationError("");
    setStep((current) => Math.min(STEP_TITLES.length, current + 1));
  }

  function back() {
    setValidationError("");
    setNavigationError("");
    setStep((current) => Math.max(1, current - 1));
  }

  function resultsHref() {
    const params = queryToSearchParams({ category: product || undefined, process: process || undefined, packaging: packaging || undefined, state: state || undefined, certification: certification || undefined, smallRunSignal });
    preserveCampaign(params);
    return params.size > 0 ? `/find-manufacturers?${params}` : "/find-manufacturers";
  }

  function showMatches() {
    setNavigationError("");
    setIsPending(true);
    track(ANALYTICS_EVENTS.wizard_completed, { product: product || "unsure", packaging: packaging || "unsure", process: process || "unsure", state: state || "any", certification: certification || "unsure", smallRunSignal });
    try {
      window.location.assign(resultsHref());
    } catch {
      setIsPending(false);
      setNavigationError("We couldn’t open the results automatically. Use the results link below.");
    }
  }

  const stepHeading = (title: string) => <h2 id={`wizard-step-${step}`} ref={headingRef} tabIndex={-1}>{title}</h2>;

  return (
    <div className="wizard-shell" aria-busy={isPending}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">Step {step} of {STEP_TITLES.length}: {STEP_TITLES[step - 1]}</p>
      <div className="wizard-progress" aria-label={`Step ${step} of ${STEP_TITLES.length}`}><span style={{ width: `${step / STEP_TITLES.length * 100}%` }} /><p>Step {step} of {STEP_TITLES.length}</p></div>

      {step === 1 ? (
        <section className="wizard-step" aria-labelledby="wizard-step-1">
          {stepHeading(STEP_TITLES[0])}<p>Pick the closest product. You can change it later.</p>
          <div className="wizard-options product-options">{PRODUCT_CATEGORIES.map((item) => <button key={item.slug} type="button" className={productAnswered && product === item.slug ? "selected" : ""} aria-pressed={productAnswered && product === item.slug} onClick={() => chooseProduct(item.slug)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
          <button className={`wizard-unsure${productAnswered && !product ? " selected" : ""}`} type="button" aria-pressed={productAnswered && !product} onClick={() => chooseProduct("")}>I’m not sure yet</button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="wizard-step" aria-labelledby="wizard-step-2">
          {stepHeading(STEP_TITLES[1])}<p>Keep “Still deciding” to see more options. Choosing a package shows only manufacturers with public evidence for that format.</p>
          <div className="wizard-fields"><label>Packaging<select value={packaging} onChange={(event) => setPackaging(event.target.value as PackagingFilter | "")}><option value="">Still deciding</option><option value="can">Can</option><option value="bottle">Bottle</option><option value="jar">Jar</option><option value="pouch">Pouch</option><option value="other">Other</option></select></label></div>
          <details className="wizard-helper" open={process ? true : undefined}><summary>I already know the process I need</summary><div className="wizard-fields"><label>Known process need<select value={process} onChange={(event) => setProcess(event.target.value as FinderProcess | "")}><option value="">I’m not sure</option>{PROCESS_CHOICES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>{process ? <p>{PROCESS_CHOICES.find((item) => item.value === process)?.help}</p> : <p>You do not need to choose a process to find manufacturers.</p>}</details>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="wizard-step" aria-labelledby="wizard-step-3">
          {stepHeading(STEP_TITLES[2])}<p>Skip any of these. Filters show sourced facts, and missing information stays unknown.</p>
          <div className="wizard-fields"><label>Location<select value={state} onChange={(event) => setState(event.target.value)}><option value="">Anywhere in the U.S.</option>{states.map((code) => <option key={code} value={code}>{stateLabel(code)}</option>)}</select></label><label>Certification you need<select value={certification} onChange={(event) => setCertification(event.target.value as CertificationFilter | "")}><option value="">None or not sure</option><option value="organic">Organic</option><option value="kosher">Kosher</option><option value="halal">Halal</option><option value="gluten-free">Gluten-free</option><option value="non-gmo">Non-GMO</option><option value="sqf">SQF</option></select></label></div>
          <label className="wizard-helper"><input type="checkbox" checked={smallRunSignal} onChange={(event) => setSmallRunSignal(event.target.checked)} /> Only show manufacturers that mention small, pilot, or trial runs</label>
          <p className="wizard-helper">A small-run mention does not guarantee your quantity will fit. Confirm the current minimum and units with each manufacturer.</p>
        </section>
      ) : null}

      {validationError ? <p className="wizard-message wizard-error" role="alert">{validationError}</p> : null}
      {isPending ? <p className="wizard-message" role="status">Opening matching manufacturers…</p> : null}
      {navigationError ? <p className="wizard-message wizard-error" role="alert">{navigationError} <a href={resultsHref()}>Open matching manufacturers</a>.</p> : null}
      <div className="wizard-actions">{step > 1 ? <button className="btn btn-ghost" type="button" onClick={back} disabled={isPending}>Back</button> : <span />}{step < STEP_TITLES.length ? <button className="btn btn-gold" type="button" onClick={next}>Next</button> : <button className="btn btn-gold" type="button" onClick={showMatches} disabled={isPending}>{isPending ? "Opening results…" : "Show matching manufacturers"}</button>}</div>
    </div>
  );
}
