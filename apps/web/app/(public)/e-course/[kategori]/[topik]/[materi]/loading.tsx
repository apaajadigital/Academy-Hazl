export default function Loading() {
  return (
    <div>
      <div className="border-b border-border-default bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[var(--surface-page)] py-10">
        <div className="mx-auto max-w-[1152px] px-8">
          <div className="skeleton mb-6 h-3 w-64" />
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-7 w-2/3" />
            <div className="skeleton h-4 w-48" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1152px] px-8 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16 !rounded-lg" />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div className="skeleton h-32 !rounded-xl" />
            <div className="skeleton h-24 !rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
