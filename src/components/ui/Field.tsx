import type { ReactNode } from "react";
import { cx } from "./cx";

export interface FieldProps {
  /** Uppercase 11px/700 label. Omit only for visually-labelled controls. */
  label?: ReactNode;
  /** id of the control this label points at. */
  htmlFor?: string;
  required?: boolean;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error text; replaces the hint and should pair with aria-invalid. */
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error, the only form row wrapper in the app. */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cx("field", className)}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className="field-req" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field-error">{error}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface FieldRowProps {
  children: ReactNode;
  className?: string;
}

/** Two fields side by side; collapses to one column under 900 px. */
export function FieldRow({ children, className }: FieldRowProps) {
  return <div className={cx("field-row", className)}>{children}</div>;
}
