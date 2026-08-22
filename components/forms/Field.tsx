import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

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
        <p className="field-error" id={errorId} role="alert">
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
