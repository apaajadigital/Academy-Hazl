"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight, accessible tabs (roving tabindex + arrow/Home/End keys). Built
 * without @radix-ui/react-tabs — that package is not installed — matching the
 * Stitch segmented-pill language. Controlled (`value`) or uncontrolled
 * (`defaultValue`).
 */

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs subcomponents must be used within <Tabs>");
  return ctx;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Controlled active tab value. */
  value?: string;
  /** Initial active tab value (uncontrolled). */
  defaultValue?: string;
  /** Fires when the active tab changes. */
  onValueChange?: (value: string) => void;
}

/** Tabs root — provides selection state to list/triggers/panels. */
export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;

  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) setInternal(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/** Segmented pill container for triggers; handles keyboard navigation. */
export function TabsList({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const activeIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (activeIndex === -1) return;
    event.preventDefault();

    let nextIndex = activeIndex;
    if (event.key === "ArrowLeft") nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    const nextTab = tabs[nextIndex];
    nextTab?.focus();
    nextTab?.click();
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn("inline-flex items-center gap-1 rounded-full bg-surface-sunken p-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Value this trigger activates; must match a TabsContent value. */
  value: string;
}

/** A single tab pill. */
export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { value: current, setValue, baseId } = useTabsContext();
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? "active" : "inactive"}
      onClick={() => setValue(value)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "bg-accent-cyan-strong text-white shadow-e1"
          : "text-text-secondary hover:text-text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Value that activates this panel; must match a TabsTrigger value. */
  value: string;
}

/** Panel shown when its `value` is active. */
export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: current, baseId } = useTabsContext();
  const selected = current === value;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!selected}
      tabIndex={0}
      className={cn("mt-4 focus:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}
