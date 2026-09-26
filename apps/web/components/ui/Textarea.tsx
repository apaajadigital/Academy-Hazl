"use client";

import { forwardRef, useId, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const areaBase =
  "w-full rounded-[var(--radius-md)] border border-solid bg-surface-card px-4 py-2.5 text-[0.9375rem] text-text-primary placeholder:text-text-muted outline-none transition-[border-color,box-shadow] focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60";
const areaOk = "border-border-strong hover:border-text-muted focus:border-accent-cyan-strong focus:ring-accent-cyan-strong/25";
const areaError = "border-red-600 focus:border-red-600 focus:ring-red-600/20";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label rendered above the control. */
  label?: ReactNode;
  /** Error text — sets the invalid style and wires `aria-describedby`. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  /** Class for the outer wrapper (label + control + message). */
  containerClassName?: string;
}

/** Labeled multiline field with subtle border, cyan focus ring, and error state. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, rows = 4, className, containerClassName, ...props },
  ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  const describedBy = error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={areaId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(areaBase, "resize-y", error ? areaError : areaOk, className)}
        {...props}
      />
      {error ? (
        <p id={`${areaId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${areaId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
