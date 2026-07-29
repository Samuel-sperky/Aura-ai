import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

/**
 * Colour grammar (never improvise past this):
 *   accent  — teal, the normal primary action
 *   gold    — the ONE brand CTA per screen, nothing else
 *   outline — default secondary
 *   ghost   — tertiary / toolbar
 *   danger  — destructive, always paired with a confirmation
 */
export type ButtonVariant = "accent" | "gold" | "outline" | "ghost" | "danger";
export type ButtonSize = "md" | "sm" | "xs";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon; rendered aria-hidden. */
  icon?: LucideIcon;
  /** Square icon-only button. REQUIRES an aria-label. */
  iconOnly?: boolean;
  /** Full-width. */
  block?: boolean;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  accent: "btn-accent",
  gold: "btn-gold",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const SIZE: Record<ButtonSize, string> = { md: "", sm: "btn-sm", xs: "btn-xs" };

const ICON_PX: Record<ButtonSize, number> = { md: 16, sm: 15, xs: 14 };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "outline",
      size = "md",
      icon: Icon,
      iconOnly = false,
      block = false,
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(
          "btn",
          VARIANT[variant],
          SIZE[size],
          iconOnly && "btn-icon",
          block && "btn-block",
          className,
        )}
      >
        {loading ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          Icon && <Icon size={ICON_PX[size]} aria-hidden="true" />
        )}
        {!iconOnly && children}
      </button>
    );
  },
);
