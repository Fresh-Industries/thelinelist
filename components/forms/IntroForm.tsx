"use client";

import { submitIntro, idleIntroState } from "@/app/actions/intro";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/client";
import {
  ACIDIFIED_OPTIONS,
  FOUNDER_STAGE_OPTIONS,
  FORMULA_STATUS_OPTIONS,
  INTRO_CATEGORY_OPTIONS,
  INTRO_PROCESS_OPTIONS,
  MOQ_READY_OPTIONS,
  NDA_OPTIONS,
  PACKAGING_FORMAT_OPTIONS,
  SPECS_READY_OPTIONS,
} from "@/lib/forms/options";
import { useActionState, useEffect, useId, useState } from "react";
import { Field, Honeypot } from "./Field";
import { FormMetaFields } from "./UtmFields";

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
  const [state, action, pending] = useActionState(submitIntro, idleIntroState);
  const [certsRequired, setCertsRequired] = useState(false);

  useEffect(() => {
    track(ANALYTICS_EVENTS.introduction_form_opened, { slug: manufacturerSlug });
  }, [manufacturerSlug]);

  useEffect(() => {
    if (state.status === "success" || state.status === "duplicate") {
      track(ANALYTICS_EVENTS.introduction_form_submitted, {
        slug: manufacturerSlug,
        duplicate: state.status === "duplicate",
      });
    }
  }, [manufacturerSlug, state.status]);

  if (state.status === "success" || state.status === "duplicate") {
    return (
      <div className="form-success" role="status">
        <h3>We got it.</h3>
        <p>
          {state.message ??
            "We will review your request before we make an intro. We only email the plant you named, and only after that review. An intro is not a yes."}
        </p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form className="lead-form" action={action} noValidate>
      <input type="hidden" name="manufacturerSlug" value={manufacturerSlug} />
      <input type="hidden" name="manufacturerName" value={manufacturerName} />
      <input type="hidden" name="sourceUrl" value={sourceUrl} />
      <FormMetaFields />
      <Honeypot id={`${id}-hp`} />

      {state.status === "error" && state.message ? (
        <p className="form-banner" role="alert">
          {state.message}
        </p>
      ) : null}

      <fieldset>
        <legend>About you</legend>
        <div className="form-grid">
          <Field id={`${id}-name`} label="Contact name" required error={errors.name}>
            <input id={`${id}-name`} name="name" type="text" autoComplete="name" required />
          </Field>
          <Field id={`${id}-email`} label="Email" required error={errors.email}>
            <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
          </Field>
          <Field id={`${id}-phone`} label="Phone" error={errors.phone}>
            <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field id={`${id}-company`} label="Company or brand" error={errors.company}>
            <input id={`${id}-company`} name="company" type="text" autoComplete="organization" />
          </Field>
          <Field id={`${id}-stage`} label="Stage" required error={errors.stage}>
            <select id={`${id}-stage`} name="stage" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {FOUNDER_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-web`} label="Website or social" error={errors.webSocial}>
            <input id={`${id}-web`} name="webSocial" type="text" autoComplete="url" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>The product</legend>
        <div className="form-grid">
          <Field
            id={`${id}-product`}
            label="What are you making?"
            required
            error={errors.product}
          >
            <input id={`${id}-product`} name="product" type="text" required />
          </Field>
          <Field
            id={`${id}-category`}
            label="Product type / category"
            required
            hint="Uses the same product tags as the directory. Add detail in the field above."
            error={errors.category}
          >
            <select id={`${id}-category`} name="category" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {INTRO_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={`${id}-process`}
            label="Process (if you know it)"
            required
            hint="Only processes this directory already publishes: HPP, hot fill, retort, or Not sure."
            error={errors.process}
          >
            <select id={`${id}-process`} name="process" required defaultValue="unsure">
              {INTRO_PROCESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={`${id}-process-needs`}
            label="Process needs"
            required
            hint="Free text. Say what the SKU needs. Do not guess a plant capability."
            error={errors.processNeeds}
          >
            <textarea id={`${id}-process-needs`} name="processNeeds" rows={3} required />
          </Field>
          <Field
            id={`${id}-pack-format`}
            label="Packaging format"
            required
            error={errors.packagingFormat}
          >
            <select id={`${id}-pack-format`} name="packagingFormat" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {PACKAGING_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={`${id}-pack-size`}
            label="Pack size"
            required
            hint="Example: 8 oz bottle, 16 oz pouch."
            error={errors.packSize}
          >
            <input id={`${id}-pack-size`} name="packSize" type="text" required />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>The run</legend>
        <div className="form-grid">
          <Field
            id={`${id}-qty`}
            label="Target volume / first-run size"
            required
            error={errors.qty}
          >
            <input id={`${id}-qty`} name="qty" type="text" required />
          </Field>
          <Field
            id={`${id}-moq`}
            label="Published-minimum readiness"
            required
            hint="This is your readiness, not a plant minimum we invented."
            error={errors.moqReady}
          >
            <select id={`${id}-moq`} name="moqReady" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {MOQ_READY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={`${id}-launch`}
            label="Needed by / first production"
            required
            error={errors.launchDate}
          >
            <input id={`${id}-launch`} name="launchDate" type="text" required />
          </Field>
          <Field id={`${id}-location`} label="Location preference" error={errors.location}>
            <input id={`${id}-location`} name="location" type="text" />
          </Field>
        </div>
        <div className="field-check form-check">
          <input
            id={`${id}-certs-req`}
            name="certsRequired"
            type="checkbox"
            value="yes"
            checked={certsRequired}
            onChange={(event) => setCertsRequired(event.target.checked)}
          />
          <label htmlFor={`${id}-certs-req`}>We need named certifications for buyers</label>
        </div>
        <Field
          id={`${id}-certs`}
          label="Certifications you need"
          required={certsRequired}
          hint="Optional unless you need named certs. There is no universal required-cert list."
          error={errors.certsNeeded}
        >
          <input id={`${id}-certs`} name="certsNeeded" type="text" />
        </Field>
      </fieldset>

      <details className="form-more">
        <summary>More about the run (optional)</summary>
        <div className="form-grid">
          <Field id={`${id}-formula`} label="Formula / recipe status" error={errors.formulaStatus}>
            <select id={`${id}-formula`} name="formulaStatus" defaultValue="">
              {FORMULA_STATUS_OPTIONS.map((option) => (
                <option key={option.value || "blank"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-specs`} label="Specs packet ready" error={errors.specsReady}>
            <select id={`${id}-specs`} name="specsReady" defaultValue="">
              {SPECS_READY_OPTIONS.map((option) => (
                <option key={option.value || "blank"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-allergens`} label="Allergen constraints" error={errors.allergens}>
            <input id={`${id}-allergens`} name="allergens" type="text" />
          </Field>
          <Field
            id={`${id}-acid`}
            label="Acidified / LACF status, if applicable"
            hint="About the SKU, not a plant claim."
            error={errors.acidifiedStatus}
          >
            <select id={`${id}-acid`} name="acidifiedStatus" defaultValue="">
              {ACIDIFIED_OPTIONS.map((option) => (
                <option key={option.value || "blank"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={`${id}-budget`}
            label="Budget readiness"
            hint="No dollar amount required."
            error={errors.budgetReadiness}
          >
            <input id={`${id}-budget`} name="budgetReadiness" type="text" />
          </Field>
          <Field
            id={`${id}-supply`}
            label="Who supplies ingredients and packaging"
            error={errors.whoSupplies}
          >
            <input id={`${id}-supply`} name="whoSupplies" type="text" />
          </Field>
          <Field id={`${id}-scale`} label="Scale-up goals" error={errors.scaleUpGoals}>
            <input id={`${id}-scale`} name="scaleUpGoals" type="text" />
          </Field>
          <Field
            id={`${id}-storage`}
            label="Storage and distribution plan"
            error={errors.storagePlan}
          >
            <input id={`${id}-storage`} name="storagePlan" type="text" />
          </Field>
          <Field id={`${id}-nda`} label="NDA willingness" error={errors.nda}>
            <select id={`${id}-nda`} name="nda" defaultValue="">
              {NDA_OPTIONS.map((option) => (
                <option key={option.value || "blank"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </details>

      <Field id={`${id}-details`} label="Anything else" error={errors.details}>
        <textarea id={`${id}-details`} name="details" rows={4} />
      </Field>

      <p className="form-aside">
        We will not email a plant until you name one and ask. Line time, allergen changeover, and
        real minimums stay with the plant.
      </p>

      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request an intro"}
      </button>
    </form>
  );
}
