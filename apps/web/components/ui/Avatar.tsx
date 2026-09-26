import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-solid border-border-default bg-surface-sunken font-semibold text-text-secondary",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** Two-letter initials from a name, e.g. "Budi Santoso" -> "BS". */
function toInitials(name?: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export interface AvatarProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  /** Image URL. When absent, falls back to initials or a user glyph. */
  src?: string;
  /** Alt text; defaults to `name`. */
  alt?: string;
  /** Display name used for initials and default alt text. */
  name?: string;
}

/** Circular avatar — image when `src` is set, else initials, else a user glyph. */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, alt, name, size, className, ...props },
  ref,
) {
  const initials = toInitials(name);
  return (
    <span ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        // Arbitrary user-provided URLs; next/image's domain allowlist would break
        // these at runtime. `@next/next/no-img-element` is disabled repo-wide.
        <img src={src} alt={alt ?? name ?? ""} className="h-full w-full object-cover" />
      ) : initials ? (
        <span aria-hidden={alt ? undefined : true}>{initials}</span>
      ) : (
        <User aria-hidden="true" className="h-1/2 w-1/2" />
      )}
    </span>
  );
});
