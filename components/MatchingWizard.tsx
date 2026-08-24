"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { PRODUCT_CATEGORIES, queryToSearchParams, stateLabel, type CertificationFilter, type DirectoryQuery, type FinderProcess, type PackagingFilter, type ProductCategorySlug } from "@/lib/directory";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const PROCESS_CHOICES: { value: FinderProcess; label: string; help: string }[] = [
  { value: "hot-fill", label: "Hot fill", help: "Often discussed for acidified sauces and some shelf-stable beverages." },
  { value: "hpp", label: "HPP", help: "A high-pressure process used for some refrigerated products. Cold pressed is not the same as HPP." },
  { value: "retort", label: "Retort", help: "A pressure heat process used for some low-acid shelf-stable foods." },
  { value: "cold-fill", label: "Cold fill", help: "Filled without a hot-fill step. The safety process and storage plan still need to be confirmed." },
  { value: "acidified", label: "Acidified", help: "A low-acid food adjusted to a controlled finished pH, common for some sauces and condiments." },
];

const STEP_TITLES = [
  "What do you want to make?",
  "Do you have a formula?",
  "What package and storage do you expect?",
  "What else do you know?",
] as const;

function isBeverage(category: string) {
  return ["soda", "energy-drink", "sports-hydration", "functional-beverages", "cold-pressed-juice", "juice", "rtd-coffee-tea", "water"].includes(category);
}

export function MatchingWizard({ states, initialProduct = "" }: { states: string[]; initialProduct?: string }) {
  const router = useRouter();
  const validInitialProduct = PRODUCT_CATEGORIES.some((item) => item.slug === initialProduct);
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState<ProductCategorySlug | "">(validInitialProduct ? initialProduct as ProductCategorySlug : "");
  const [productAnswered, setProductAnswered] = useState(validInitialProduct);
  const [formula, setFormula] = useState("");
  const [packaging, setPackaging] = useState<PackagingFilter | "">("");
  const [storage, setStorage] = useState("");
  const [carbonation, setCarbonation] = useState("");
  const [process, setProcess] = useState<FinderProcess | "">("");
  const [volume, setVolume] = useState("");
  const [state, setState] = useState("");
  const [certification, setCertification] = useState<CertificationFilter | "">("");
  const [timeline, setTimeline] = useState("");
  const [validationError, setValidationError] = useState("");
  const [navigationError, setNavigationError] = useState("");
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const priorStep = useRef(step);
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    track(ANALYTICS_EVENTS.wizard_started, { initialProduct: initialProduct || "none" });
  }, [initialProduct]);

  useEffect(() => {
    if (priorStep.current === step) return;
    priorStep.current = step;
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => () => {
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
  }, []);

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
    if (step === 2 && !formula) {
      setValidationError("Choose a formula path, including “I’m not sure.”");
      return;
    }
    setValidationError("");
    setStep((current) => Math.min(4, current + 1));
  }

  function back() {
    setValidationError("");
    setNavigationError("");
    setStep((current) => Math.max(1, current - 1));
  }

  function resultsHref() {
    const query: DirectoryQuery = {
      category: product || undefined,
      process: process || undefined,
      packaging: packaging || undefined,
      state: state || undefined,
      certification: certification || undefined,
    };
    const params = queryToSearchParams(query);
    return params.size > 0 ? `/find-manufacturers?${params}` : "/find-manufacturers";
  }

  function showMatches() {
    const destination = resultsHref();
    setNavigationError("");
    track(ANALYTICS_EVENTS.wizard_completed, { product: product || "unsure", formula: formula || "unsure", packaging: packaging || "unsure", storage: storage || "unsure", carbonation: carbonation || "unsure", process: process || "unsure", volume: volume || "unsure", state: state || "any", certification: certification || "unsure", timeline: timeline || "unsure" });
    try {
      startTransition(() => router.push(destination));
      fallbackTimer.current = window.setTimeout(() => {
        if (window.location.pathname.endsWith("/find-manufacturers/wizard")) window.location.assign(destination);
      }, 2500);
    } catch {
      setNavigationError("We couldn’t open the results automatically. Use the results link below.");
    }
  }

  const stepHeading = (title: string) => <h2 id={`wizard-step-${step}`} ref={headingRef} tabIndex={-1}>{title}</h2>;

  return (
    <div className="wizard-shell" aria-busy={isPending}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">Step {step} of 4: {STEP_TITLES[step - 1]}</p>
      <div className="wizard-progress" aria-label={`Step ${step} of 4`}><span style={{ width: `${step * 25}%` }} /><p>Step {step} of 4</p></div>

      {step === 1 ? <section className="wizard-step" aria-labelledby="wizard-step-1">{stepHeading(STEP_TITLES[0])}<p>Pick the closest product. You can change it later.</p><div className="wizard-options product-options">{PRODUCT_CATEGORIES.map((item) => <button key={item.slug} type="button" className={productAnswered && product === item.slug ? "selected" : ""} aria-pressed={productAnswered && product === item.slug} onClick={() => chooseProduct(item.slug)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div><button className={`wizard-unsure${productAnswered && !product ? " selected" : ""}`} type="button" aria-pressed={productAnswered && !product} onClick={() => chooseProduct("")}>I’m not sure yet</button></section> : null}

      {step === 2 ? <section className="wizard-step" aria-labelledby="wizard-step-2">{stepHeading(STEP_TITLES[1])}<p>This helps separate a custom product from a plant’s existing private-label product.</p><div className="wizard-options three-up"><button type="button" className={formula === "custom" ? "selected" : ""} aria-pressed={formula === "custom"} onClick={() => { setFormula("custom"); setValidationError(""); }}><strong>I have my own formula</strong><span>I want a manufacturer to make it to my specifications.</span></button><button type="button" className={formula === "private-label" ? "selected" : ""} aria-pressed={formula === "private-label"} onClick={() => { setFormula("private-label"); setValidationError(""); }}><strong>I want a private-label product</strong><span>I am open to a manufacturer’s existing formula under my brand.</span></button><button type="button" className={formula === "unsure" ? "selected" : ""} aria-pressed={formula === "unsure"} onClick={() => { setFormula("unsure"); setValidationError(""); }}><strong>I’m not sure</strong><span>I need help understanding the difference.</span></button></div></section> : null}

      {step === 3 ? <section className="wizard-step" aria-labelledby="wizard-step-3">{stepHeading(STEP_TITLES[2])}<p>Choose what you know. These answers are preferences, not claims about a plant.</p><div className="wizard-fields"><label>Packaging<select value={packaging} onChange={(event) => setPackaging(event.target.value as PackagingFilter | "")}><option value="">Still deciding</option><option value="can">Can</option><option value="bottle">Bottle</option><option value="jar">Jar</option><option value="pouch">Pouch</option><option value="other">Other</option></select></label><label>Storage<select value={storage} onChange={(event) => setStorage(event.target.value)}><option value="">I’m not sure</option><option value="shelf-stable">Shelf-stable</option><option value="refrigerated">Refrigerated</option></select></label>{isBeverage(product) ? <label>Carbonation<select value={carbonation} onChange={(event) => setCarbonation(event.target.value)}><option value="">I’m not sure</option><option value="still">Still</option><option value="sparkling">Carbonated or sparkling</option></select></label> : null}<label>Known process need<select value={process} onChange={(event) => setProcess(event.target.value as FinderProcess | "")}><option value="">I’m not sure</option>{PROCESS_CHOICES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>{process ? <p className="wizard-helper">{PROCESS_CHOICES.find((item) => item.value === process)?.help}</p> : null}</section> : null}

      {step === 4 ? <section className="wizard-step" aria-labelledby="wizard-step-4">{stepHeading(STEP_TITLES[3])}<p>These details help narrow stated matches. None require contact information.</p><div className="wizard-fields"><label>First-run volume<select value={volume} onChange={(event) => setVolume(event.target.value)}><option value="">Still figuring it out</option><option value="target">I have a target range</option><option value="small">I only know it needs to be small</option></select></label><label>Location<select value={state} onChange={(event) => setState(event.target.value)}><option value="">Anywhere in the U.S.</option>{states.map((code) => <option key={code} value={code}>{stateLabel(code)}</option>)}</select></label><label>Buyer certification need<select value={certification} onChange={(event) => setCertification(event.target.value as CertificationFilter | "")}><option value="">None or not sure</option><option value="organic">Organic</option><option value="kosher">Kosher</option><option value="halal">Halal</option><option value="gluten-free">Gluten-free</option><option value="non-gmo">Non-GMO</option><option value="sqf">SQF</option></select></label><label>Timing<select value={timeline} onChange={(event) => setTimeline(event.target.value)}><option value="">Exploring only</option><option value="next-3">Next 3 months</option><option value="3-6">3 to 6 months</option><option value="6-12">6 to 12 months</option><option value="later">More than 12 months</option></select></label></div><p className="wizard-helper">Plants set their own minimum runs. Choosing “small” does not invent or apply a national MOQ.</p></section> : null}

      {validationError ? <p className="wizard-message wizard-error" role="alert">{validationError}</p> : null}
      {isPending ? <p className="wizard-message" role="status">Opening matching manufacturers…</p> : null}
      {navigationError ? <p className="wizard-message wizard-error" role="alert">{navigationError} <a href={resultsHref()}>Open matching manufacturers</a>.</p> : null}
      <div className="wizard-actions">{step > 1 ? <button className="btn btn-ghost" type="button" onClick={back} disabled={isPending}>Back</button> : <span />}{step < 4 ? <button className="btn btn-gold" type="button" onClick={next}>Next</button> : <button className="btn btn-gold" type="button" onClick={showMatches} disabled={isPending}>{isPending ? "Opening results…" : "Show matching manufacturers"}</button>}</div>
    </div>
  );
}
