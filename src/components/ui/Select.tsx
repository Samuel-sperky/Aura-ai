import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cx } from "./cx";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Options rendered for you; ignore and pass children for <optgroup> layouts. */
  options?: ReadonlyArray<SelectOption>;
  /** Leading empty option (e.g. "Všetky oblasti"). Value is "". */
  placeholder?: string;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { options, placeholder, invalid = false, className, children, ...rest },
    ref,
  ) {
    return (
      <select
        {...rest}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx("select", className)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
    );
  },
);
