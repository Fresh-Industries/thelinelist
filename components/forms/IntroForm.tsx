"use client";

import { submitIntro, type IntroActionState } from "@/app/actions/intro";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/client";
import {
  FOUNDER_STAGE_OPTIONS,
  FORMULA_STATUS_OPTIONS,
  INTRO_CATEGORY_OPTIONS,
  INTRO_PROCESS_OPTIONS,
  MOQ_READY_OPTIONS,
  PACKAGING_FORMAT_OPTIONS,
} from "@/lib/forms/options";
import { useActionState, useEffect, useId, useState } from "react";
import { Field, Honeypot } from "./Field";
import { FormMetaFields } from "./UtmFields";

const STEP_LABELS = ["Product", "Run details", "Contact"] as const;
const idleIntroState: IntroActionState = { status: "idle" };

export function IntroForm({
  manufacturerSlug,
  manufacturerName,
  sourceUrl,
}: {
  manufacturerSlug: string;
  manufacturerName: string;
  sourceUrl: string;
}) {
  const id = useId();
  const [step, setStep] = useState(1);
  const [state, action, pending] = useActionState(submitIntro, idleIntroState);

  useEffect(() => {
    track(ANALYTICS_EVENTS.introduction_form_opened, { slug: manufacturerSlug });
  }, [manufacturerSlug]);

  useEffect(() => {
    if (state.status === "success" || state.status === "duplicate") {
      track(ANALYTICS_EVENTS.introduction_requested, {
        slug: manufacturerSlug,
        duplicate: state.status === "duplicate",
      });
    }
  }, [manufacturerSlug, state.status]);

  if (state.status === "success" || state.status === "duplicate") {
    return (
      <div className="form-success" role="status">
        <h2>Request received</h2>
        <p>{state.message ?? "We have your request and will follow up by email."}</p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form className="lead-form intro-steps" action={action} noValidate onSubmit={() => setStep(1)}>
      <input type="hidden" name="manufacturerSlug" value={manufacturerSlug} />
      <input type="hidden" name="manufacturerName" value={manufacturerName} />
      <input type="hidden" name="sourceUrl" value={sourceUrl} />
      <FormMetaFields />
      <Honeypot id={`${id}-hp`} />

      <ol className="form-stepper" aria-label="Introduction request progress">
        {STEP_LABELS.map((label, index) => (
          <li key={label} className={step === index + 1 ? "is-current" : step > index + 1 ? "is-done" : ""}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>

      {state.status === "error" && state.message ? <p className="form-banner" role="alert">{state.message}</p> : null}

      <fieldset hidden={step !== 1}>
        <legend>What are you making?</legend>
        <div className="form-grid">
          <Field id={`${id}-product`} label="Product" required hint="Example: carbonated energy drink in a 12 oz can." error={errors.product}>
            <input id={`${id}-product`} name="product" type="text" required />
          </Field>
          <Field id={`${id}-category`} label="Closest category" required error={errors.category}>
            <select id={`${id}-category`} name="category" required defaultValue="unsure">
              {INTRO_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field id={`${id}-formula`} label="Formula status" error={errors.formulaStatus}>
            <select id={`${id}-formula`} name="formulaStatus" defaultValue="unsure">
              {FORMULA_STATUS_OPTIONS.map((option) => <option key={option.value || "blank"} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field id={`${id}-stage`} label="Where are you now?" required error={errors.stage}>
            <select id={`${id}-stage`} name="stage" required defaultValue="idea">
              {FOUNDER_STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset hidden={step !== 2}>
        <legend>What do you know about the run?</legend>
        <div className="form-grid">
          <Field id={`${id}-process`} label="Expected process" required error={errors.process}>
            <select id={`${id}-process`} name="process" required defaultValue="unsure">
              {INTRO_PROCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field id={`${id}-process-needs`} label="Process or storage needs" required hint="It is fine to write “Not sure.”" error={errors.processNeeds}>
            <input id={`${id}-process-needs`} name="processNeeds" type="text" required defaultValue="Not sure" />
          </Field>
          <Field id={`${id}-packaging`} label="Packaging" required error={errors.packagingFormat}>
            <select id={`${id}-packaging`} name="packagingFormat" required defaultValue="other">
              {PACKAGING_FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field id={`${id}-pack-size`} label="Pack size or note" required error={errors.packSize}>
            <input id={`${id}-pack-size`} name="packSize" type="text" required placeholder="12 oz can, or Not sure" />
          </Field>
          <Field id={`${id}-qty`} label="First-run volume" required error={errors.qty}>
            <input id={`${id}-qty`} name="qty" type="text" required placeholder="Units, cases, gallons, or Not sure" />
          </Field>
          <Field id={`${id}-storage`} label="Storage plan" error={errors.storagePlan}>
            <input id={`${id}-storage`} name="storagePlan" type="text" placeholder="Shelf-stable, refrigerated, or Not sure" />
          </Field>
        </div>
      </fieldset>

      <fieldset hidden={step !== 3}>
        <legend>Where should we follow up?</legend>
        <div className="form-grid">
          <Field id={`${id}-name`} label="Name" required error={errors.name}>
            <input id={`${id}-name`} name="name" type="text" autoComplete="name" required />
          </Field>
          <Field id={`${id}-email`} label="Email" required error={errors.email}>
            <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
          </Field>
          <Field id={`${id}-company`} label="Company or brand" error={errors.company}>
            <input id={`${id}-company`} name="company" type="text" autoComplete="organization" />
          </Field>
          <Field id={`${id}-launch`} label="Timing" required error={errors.launchDate}>
            <input id={`${id}-launch`} name="launchDate" type="text" required placeholder="Month, quarter, or flexible" />
          </Field>
          <Field id={`${id}-moq`} label="Ready for a published minimum?" required error={errors.moqReady}>
            <select id={`${id}-moq`} name="moqReady" required defaultValue="unsure">
              {MOQ_READY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field id={`${id}-location`} label="Location preference" error={errors.location}>
            <input id={`${id}-location`} name="location" type="text" />
          </Field>
          <Field id={`${id}-certs`} label="Certifications you need" error={errors.certsNeeded}>
            <input id={`${id}-certs`} name="certsNeeded" type="text" placeholder="Leave blank if none or not sure" />
          </Field>
          <Field id={`${id}-details`} label="Anything else" error={errors.details}>
            <textarea id={`${id}-details`} name="details" rows={3} />
          </Field>
        </div>
      </fieldset>

      <div className="form-step-actions">
        {step > 1 ? <button className="btn btn-ghost" type="button" onClick={() => setStep((value) => value - 1)}>Back</button> : <span />}
        {step < 3 ? (
          <button className="btn btn-gold" type="button" onClick={() => setStep((value) => value + 1)}>Continue</button>
        ) : (
          <button className="btn btn-gold" type="submit" disabled={pending}>{pending ? "Sending…" : "Request introduction"}</button>
        )}
      </div>
      <p className="form-aside">The manufacturer will confirm line availability, current minimums, and technical fit.</p>
    </form>
  );
}
