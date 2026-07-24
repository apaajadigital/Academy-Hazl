export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="border-b border-border-default bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[var(--surface-page)] py-12">
        <div className="mx-auto max-w-[1152px] px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="skeleton aspect-video !rounded-2xl" />
            <div className="flex flex-col gap-4">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-16" />
              <div className="skeleton h-10 !rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="mx-auto max-w-[1152px] px-8 py-10">
        <div className="skeleton mb-8 h-6 w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-8">
            <div className="skeleton mb-4 h-5 w-40" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="skeleton aspect-video w-52 flex-none !rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
