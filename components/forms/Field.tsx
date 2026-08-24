import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

export function FormErrorSummary({
  errors,
  message,
  summaryRef,
}: {
  errors?: Record<string, string>;
  message?: string;
  summaryRef?: RefObject<HTMLDivElement | null>;
}) {
  const messages = Object.values(errors ?? {});

  if (messages.length === 0) {
    return message ? (
      <div className="form-banner" role="alert" tabIndex={-1} ref={summaryRef}>
        {message}
      </div>
    ) : null;
  }

  return (
    <div className="form-banner" role="alert" tabIndex={-1} ref={summaryRef}>
      <strong>
        {messages.length === 1
          ? "Please fix this field before sending:"
          : `Please fix these ${messages.length} fields before sending:`}
      </strong>
      <ul>
        {messages.map((error, index) => (
          <li key={`${error}-${index}`}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field${error ? " field-invalid" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span className="req">Required</span> : <span className="opt">Optional</span>}
      </label>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {bindControl(children, { describedBy, invalid: Boolean(error) })}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function bindControl(
  children: ReactNode,
  options: { describedBy?: string; invalid: boolean },
): ReactNode {
  if (!isValidElement(children)) return children;
  const element = children as ReactElement<{
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
  return cloneElement(element, {
    "aria-describedby": options.describedBy,
    "aria-invalid": options.invalid || undefined,
  });
}

export function Honeypot({ id = "hp" }: { id?: string }) {
  return (
    <div className="hp" aria-hidden="true">
      <label htmlFor={id}>Company website</label>
      <input id={id} name="hp" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
