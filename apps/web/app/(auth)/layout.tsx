import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

// No `title` metadata here on purpose: each auth page sets its own title and the
// root layout's `%s | Jago Akademi` template wraps it exactly once. Declaring a
// bare `title.default: "Jago Akademi"` here caused the root template to double it
// into "Jago Akademi | Jago Akademi" (QA M-1).

/**
 * Auth shell (Stitch redesign, Jul 2026) — a centered ~420px frosted card on the
 * page surface with soft brand-tinted corner glows, logo above the card. Presentation
 * only: no routing/auth logic lives here. Light-only (all `dark:` variants stripped).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page p-4 py-10">
      {/* Atmospheric brand glows (decorative, light-only). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(0,119,168,0.10)_0%,transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 -left-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(204,0,82,0.08)_0%,transparent_70%)]"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 text-text-primary transition-colors hover:text-accent"
          >
            <Image src="/logo.png" alt="Hazl Academy" width={1414} height={286} priority className="h-8 w-auto" />
          </Link>
        </div>

        <div className="glass-card rounded-[var(--radius-xl)] p-8 shadow-e2 sm:p-10">{children}</div>

        <p className="mt-6 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} Jago Akademi &middot; Belajar. Berlatih. Berkarier.
        </p>
      </div>
    </div>
  );
}
