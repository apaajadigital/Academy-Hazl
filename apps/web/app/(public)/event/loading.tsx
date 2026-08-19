/**
 * Streaming fallback for the event catalogue.
 *
 * /event is a server component, so it renders only once its fetch settles.
 * Without this file Next.js shows the previous route until then, which made
 * "still loading" and "nothing scheduled" look identical to a visitor on a slow
 * connection — the same confusion the error/empty split fixes on the data side.
 */
export default function EventListLoading() {
  return (
    <div className="pt-16" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat daftar event…</span>
      <div className="container-pad">
        <div className="mb-8 h-8 w-64 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />
        <div className="mb-8 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-[var(--surface-sunken)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-[var(--surface-sunken)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
