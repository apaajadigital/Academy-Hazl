import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The one horizontal frame every admin dashboard page sits in.
 *
 * WHY THIS WRAPS `.dash-container` INSTEAD OF RESTATING IT
 * The design brief asked for `mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8`.
 * `.dash-container` (app/globals.css) already IS that: `--container-max` is
 * `100rem` = 1600px, with padding-inline 16 → 24 → 32px. Hard-coding the same
 * numbers in Tailwind would give admin its own copy of a value trainer and
 * student read from a token, and the two would drift the first time the token
 * moved. Same frame, one source.
 *
 * Vertical padding is deliberately NOT set here: `.al-content` in
 * app/admin/layout.tsx already applies 32px (24px ≤768px). Adding `py-*` on top
 * would double it — which is how the old page ended up feeling cramped at the
 * top and loose at the bottom.
 *
 * The gap is the page's vertical rhythm: every direct child is a section, and
 * sections are the only thing allowed to set the spacing between themselves.
 */
export function AdminPageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "dash-container",
        "flex flex-col gap-6 lg:gap-8",
        className,
      )}
      {...props}
    />
  );
}
