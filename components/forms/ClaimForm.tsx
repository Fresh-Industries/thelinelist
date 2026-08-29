"use client";

import { submitClaim, type ClaimActionState } from "@/app/actions/claim";
import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { INTRO_CATEGORY_OPTIONS, INTRO_PROCESS_OPTIONS, US_STATE_OPTIONS } from "@/lib/forms/options";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Field, FormErrorSummary, Honeypot } from "./Field";
import { FormMetaFields } from "./UtmFields";

const idleClaimState: ClaimActionState = { status: "idle" };

export interface ClaimPlantOption {
  slug: string;
  name: string;
  city: string;
  state: string;
}

export function ClaimForm({
  plants,
  preset,
}: {
  plants: ClaimPlantOption[];
  preset?: ClaimPlantOption;
}) {
  const id = useId();
  const started = useRef(false);
  const [state, action, pending] = useActionState(submitClaim, idleClaimState);
  const [notListed, setNotListed] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(preset?.slug ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const selected = plants.find((plant) => plant.slug === selectedSlug);
  const cityDefault = preset?.city ?? selected?.city ?? "";
  const stateDefault = preset?.state ?? selected?.state ?? "";

  useEffect(() => {
    if (state.status === "success" || state.status === "duplicate") {
      track(ANALYTICS_EVENTS.manufacturer_claim_submitted, {
        slug: selectedSlug || "not-listed",
        duplicate: state.status === "duplicate",
      });
    }
  }, [selectedSlug, state.status]);

  useEffect(() => {
    if (state.status !== "error") return;
    const firstField = Object.keys(state.fieldErrors ?? {})[0];
    const control = firstField ? formRef.current?.elements.namedItem(firstField) : null;
    const target = control instanceof HTMLElement ? control : summaryRef.current;
    if (!target) return;
    const details = target.closest("details");
    if (details instanceof HTMLDetailsElement) details.open = true;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  function markStarted() {
    if (started.current) return;
    started.current = true;
    track(ANALYTICS_EVENTS.manufacturer_claim_started, {
      slug: selectedSlug || preset?.slug || "about",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    ensureStartedAt(form);
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    startTransition(() => action(formData));
  }

  if (state.status === "success" || state.status === "duplicate") {
    return (
      <div className="form-success" role="status">
        <h3>Submitted for review.</h3>
        <p>
          {state.message ??
            "We will not auto-approve a claim. We still verify facts against the plant's public site. Blank fields stay unpublished."}
        </p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const manufacturerName = preset?.name ?? selected?.name ?? "";
  const manufacturerSlug = notListed ? "not-listed" : (preset?.slug ?? selectedSlug);

  return (
    <form
      ref={formRef}
      className="lead-form"
      onSubmit={handleSubmit}
      onFocus={(event) => {
        ensureStartedAt(event.currentTarget);
        markStarted();
      }}
    >
      <input type="hidden" name="manufacturerSlug" value={manufacturerSlug} />
      {!notListed ? <input type="hidden" name="manufacturerName" value={manufacturerName} /> : null}
      <FormMetaFields />
      <Honeypot id={`${id}-hp`} />

      {state.status === "error" ? (
        <FormErrorSummary errors={state.fieldErrors} message={state.message} summaryRef={summaryRef} />
      ) : null}

      <fieldset>
        <legend>The plant</legend>
        <div className="form-grid">
          {preset ? (
            <Field id={`${id}-mfr`} label="Company / plant name" required>
              <input id={`${id}-mfr`} type="text" value={preset.name} readOnly />
            </Field>
          ) : (
            <Field
              id={`${id}-mfr-select`}
              label="Company / plant name"
              required
              error={errors.manufacturerSlug}
            >
              <select
                id={`${id}-mfr-select`}
                value={notListed ? "not-listed" : selectedSlug}
                onChange={(event) => {
                  const next = event.target.value;
                  setNotListed(next === "not-listed");
                  setSelectedSlug(next === "not-listed" ? "" : next);
                }}
                required
              >
                <option value="">Select a listed plant</option>
                {plants.map((plant) => (
                  <option key={plant.slug} value={plant.slug}>
                    {plant.name}
                  </option>
                ))}
                <option value="not-listed">We are not on this list yet</option>
              </select>
            </Field>
          )}
          {!preset && notListed ? (
            <Field
              id={`${id}-mfr-name`}
              label="Company / plant name"
              required
              error={errors.manufacturerName}
            >
              <input
                id={`${id}-mfr-name`}
                name="manufacturerName"
                type="text"
                required
              />
            </Field>
          ) : null}
          <Field id={`${id}-city`} label="City" required error={errors.city}>
            <input
              id={`${id}-city`}
              key={`${selectedSlug}-city`}
              name="city"
              type="text"
              required
              defaultValue={cityDefault}
            />
          </Field>
          <Field id={`${id}-state`} label="State" required error={errors.state}>
            <select
              id={`${id}-state`}
              key={`${selectedSlug}-state`}
              name="state"
              required
              defaultValue={stateDefault}
            >
              <option value="">Select</option>
              {US_STATE_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${id}-street`} label="Street" error={errors.street}>
            <input id={`${id}-street`} name="street" type="text" autoComplete="street-address" />
          </Field>
          <Field id={`${id}-zip`} label="ZIP" error={errors.zip}>
            <input id={`${id}-zip`} name="zip" type="text" autoComplete="postal-code" />
          </Field>
        </div>
        {notListed ? <input type="hidden" name="notListed" value="yes" /> : null}
      </fieldset>

      <fieldset>
        <legend>Contact</legend>
        <div className="form-grid">
          <Field id={`${id}-contact`} label="Contact person" required error={errors.contactName}>
            <input
              id={`${id}-contact`}
              name="contactName"
              type="text"
              autoComplete="name"
              required
            />
          </Field>
          <Field id={`${id}-email`} label="Work email" required error={errors.workEmail}>
            <input
              id={`${id}-email`}
              name="workEmail"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Field id={`${id}-phone`} label="Phone" error={errors.phone}>
            <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field id={`${id}-role`} label="Role" required error={errors.role}>
            <input id={`${id}-role`} name="role" type="text" required />
          </Field>
          <Field
            id={`${id}-site`}
            label="Website"
            required={notListed}
            hint={notListed ? "Tell us which public page to read." : undefined}
            error={errors.website}
          >
            <input id={`${id}-site`} name="website" type="url" autoComplete="url" />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Corrections</legend>
        <p className="form-aside">
          Only correct what the plant already states on its public site. Do not invent
          certifications, minimums, or processes. Blank stays unpublished.
        </p>
        <fieldset className="tag-set">
          <legend>Published process tags (existing directory tags only)</legend>
          {INTRO_PROCESS_OPTIONS.filter((option) => option.value !== "unsure").map((option) => (
            <label key={option.value} className="field-check">
              <input type="checkbox" name="processTags" value={option.value} />
              {option.label}
            </label>
          ))}
        </fieldset>
        <fieldset className="tag-set">
          <legend>Published product tags (existing directory tags only)</legend>
          {INTRO_CATEGORY_OPTIONS.filter((option) => option.value !== "unsure").map((option) => (
            <label key={option.value} className="field-check">
              <input type="checkbox" name="productTags" value={option.value} />
              {option.label}
            </label>
          ))}
        </fieldset>
        <Field
          id={`${id}-activity`}
          label="Product types, activities, or process corrections"
          error={errors.activityCorrections}
        >
          <textarea id={`${id}-activity`} name="activityCorrections" rows={3} />
        </Field>
        <Field id={`${id}-corrections`} label="Other fact corrections" error={errors.corrections}>
          <textarea id={`${id}-corrections`} name="corrections" rows={3} />
        </Field>
        <Field
          id={`${id}-moq`}
          label="Minimum order / run-size correction"
          error={errors.moqCorrection}
        >
          <input id={`${id}-moq`} name="moqCorrection" type="text" />
        </Field>
        <Field
          id={`${id}-certs`}
          label="Named certifications correction"
          error={errors.certsCorrection}
        >
          <input id={`${id}-certs`} name="certsCorrection" type="text" />
        </Field>
      </fieldset>

      <details className="form-more">
        <summary>More plant detail (optional)</summary>
        <div className="form-grid">
          <Field id={`${id}-op`} label="Operation type" error={errors.operationType}>
            <input id={`${id}-op`} name="operationType" type="text" />
          </Field>
          <Field id={`${id}-reviewed`} label="Update or last-reviewed note" error={errors.reviewedNote}>
            <input id={`${id}-reviewed`} name="reviewedNote" type="text" />
          </Field>
          <Field
            id={`${id}-source`}
            label="Source attribution (which page to read)"
            error={errors.sourceAttribution}
          >
            <input id={`${id}-source`} name="sourceAttribution" type="text" />
          </Field>
          <Field id={`${id}-capacity`} label="Capacity notes" error={errors.capacityNotes}>
            <input id={`${id}-capacity`} name="capacityNotes" type="text" />
          </Field>
          <Field
            id={`${id}-equip`}
            label="Equipment, high level"
            error={errors.equipmentNotes}
          >
            <input id={`${id}-equip`} name="equipmentNotes" type="text" />
          </Field>
          <Field
            id={`${id}-buys`}
            label="Who buys ingredients and packaging"
            error={errors.whoBuys}
          >
            <input id={`${id}-buys`} name="whoBuys" type="text" />
          </Field>
          <Field id={`${id}-qc`} label="QC summary" error={errors.qcSummary}>
            <input id={`${id}-qc`} name="qcSummary" type="text" />
          </Field>
          <Field
            id={`${id}-dev`}
            label="Product development services"
            error={errors.productDev}
          >
            <input id={`${id}-dev`} name="productDev" type="text" />
          </Field>
          <Field id={`${id}-storage`} label="Storage" error={errors.storage}>
            <input id={`${id}-storage`} name="storage" type="text" />
          </Field>
          <Field id={`${id}-dist`} label="Distribution" error={errors.distribution}>
            <input id={`${id}-dist`} name="distribution" type="text" />
          </Field>
        </div>
        <Field id={`${id}-about`} label="Notes / about" error={errors.aboutNotes}>
          <textarea id={`${id}-about`} name="aboutNotes" rows={3} />
        </Field>
      </details>

      <Field id={`${id}-message`} label="Message" error={errors.message}>
        <textarea id={`${id}-message`} name="message" rows={3} />
      </Field>
      <div className="field-check form-check">
        <input id={`${id}-featured`} name="featuredInterest" type="checkbox" value="yes" />
        <label htmlFor={`${id}-featured`}>Ask about a featured listing</label>
      </div>
      <div className="field-check form-check">
        <input id={`${id}-consent`} name="consent" type="checkbox" value="yes" required aria-describedby={`${id}-consent-help`} />
        <label htmlFor={`${id}-consent`}>I agree that The Line List may securely store this submission and follow up by email.</label>
      </div>
      <p id={`${id}-consent-help`} className="form-aside">Claims are reviewed manually. Private contact details are not published.</p>
      {errors.consent ? <p className="field-error">{errors.consent}</p> : null}

      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Submit claim for review"}
      </button>
    </form>
  );
}

function ensureStartedAt(form: HTMLFormElement) {
  const input = form.elements.namedItem("startedAt");
  if (input instanceof HTMLInputElement && !input.value) {
    input.value = String(Date.now());
  }
}
