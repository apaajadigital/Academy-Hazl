import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shimmer placeholder built on the `.skeleton` class from globals.css (respects
 * prefers-reduced-motion). Defaults to a text-line block; override h-/w-/rounded
 * via className.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("skeleton h-4 w-full", className)} {...props} />;
}
