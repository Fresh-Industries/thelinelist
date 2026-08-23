"use client";

import { submitNewsletter, type NewsletterActionState } from "@/app/actions/newsletter";
import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useActionState, useEffect, useId } from "react";
import { Honeypot } from "./Field";
import { FormMetaFields } from "./UtmFields";

const idleNewsletterState: NewsletterActionState = { status: "idle" };

export function NewsletterForm() {
  const id = useId();
  const [state, action, pending] = useActionState(submitNewsletter, idleNewsletterState);

  useEffect(() => {
    if (state.status === "success") {
      track(ANALYTICS_EVENTS.newsletter_signup_completed);
    }
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p className="form-success-inline" role="status">
        {state.message ?? "You are on the list."}
      </p>
    );
  }

  return (
    <form className="nl-form" action={action} noValidate>
      <FormMetaFields />
      <Honeypot id={`${id}-hp`} />
      <label htmlFor={`${id}-email`}>Email</label>
      <div className="row">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? `${id}-error` : undefined}
        />
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Subscribe"}
        </button>
      </div>
      {state.status === "error" ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {state.fieldErrors?.email ??
            state.message ??
            "We could not send that. Try again or write hello@thelinelist.com."}
        </p>
      ) : null}
    </form>
  );
}
