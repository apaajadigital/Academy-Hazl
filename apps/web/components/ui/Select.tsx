"use client";

import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const selectBase =
  "w-full appearance-none rounded-[var(--radius-md)] border border-solid bg-surface-card px-4 py-2.5 pr-10 text-[0.9375rem] text-text-primary outline-none transition-[border-color,box-shadow] focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60";
const selectOk = "border-border-strong hover:border-text-muted focus:border-accent-cyan-strong focus:ring-accent-cyan-strong/25";
const selectError = "border-red-600 focus:border-red-600 focus:ring-red-600/20";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Error text — sets the invalid style and wires `aria-describedby`. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  /** Disabled placeholder option rendered first. */
  placeholder?: string;
  /** Class for the outer wrapper (label + control + message). */
  containerClassName?: string;
}

/** Labeled native select with a lucide caret, subtle border, and error state. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, placeholder, id, className, containerClassName, children, value, defaultValue, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;
  // With a placeholder and no caller-provided value, select the disabled
  // placeholder option by default (React forbids `selected` on <option>).
  const resolvedDefault =
    defaultValue ?? (placeholder && value === undefined ? "" : undefined);

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          defaultValue={resolvedDefault}
          className={cn(selectBase, error ? selectError : selectOk, className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
      {error ? (
        <p id={`${selectId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
