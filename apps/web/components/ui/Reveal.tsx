"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  children: ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  /** Initial rise distance in px. */
  y?: number;
  className?: string;
  /**
   * Fire the reveal immediately on mount instead of waiting for the element to
   * scroll into view.
   *
   * MUST be set for any above-the-fold content. A `whileInView` reveal is driven
   * by an IntersectionObserver "enter" callback; when the element is already in
   * the viewport at load, that enter can fail to fire and the element stays stuck
   * at its hidden initial state (opacity 0) — leaving the hero blank (QA C-1).
   * `immediate` animates on mount and never depends on the observer.
   */
  immediate?: boolean;
};

/**
 * Subtle reveal (fade + short rise), fired once. Compositor-friendly
 * (opacity/transform only) and disabled entirely under prefers-reduced-motion.
 *
 * Two modes: reveal-on-scroll (default, for below-the-fold content) and
 * reveal-on-mount (`immediate`, required for above-the-fold content).
 */
export function Reveal({ children, delay = 0, y = 16, className, immediate = false }: Props) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  const shown = { opacity: 1, y: 0 };
  const transition = { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay } as const;

  if (immediate) {
    return (
      <motion.div
        initial={{ opacity: 0, y }}
        animate={shown}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={shown}
      viewport={{ once: true, amount: 0.15 }}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
