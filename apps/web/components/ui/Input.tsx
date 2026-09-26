"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[var(--radius-md)] border border-solid bg-surface-card px-4 py-2.5 text-[0.9375rem] text-text-primary placeholder:text-text-muted outline-none transition-[border-color,box-shadow] focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60";
const fieldOk = "border-border-strong hover:border-text-muted focus:border-accent-cyan-strong focus:ring-accent-cyan-strong/25";
const fieldError = "border-red-600 focus:border-red-600 focus:ring-red-600/20";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Error text — sets the invalid style and wires `aria-describedby`. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  /** Leading icon, e.g. `<Mail size={18} />`. */
  leftIcon?: ReactNode;
  /** Trailing slot, e.g. a show/hide-password toggle button. Rendered inside the same control row as the input, right-aligned. */
  rightSlot?: ReactNode;
  /** Class for the outer wrapper (label + control + message). */
  containerClassName?: string;
}

/** Labeled text input with subtle border, cyan focus ring, and error state. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, id, className, containerClassName, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldBase, error ? fieldError : fieldOk, leftIcon && "pl-11", rightSlot && "pr-11", className)}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
