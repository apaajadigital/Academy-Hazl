export default function Loading() {
  return (
    <div>
      <div className="border-b border-border-default bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[var(--surface-page)] py-10">
        <div className="mx-auto max-w-[1152px] px-8">
          <div className="skeleton mb-6 h-3 w-48" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-7 w-2/3" />
              <div className="skeleton h-4 w-40" />
            </div>
            <div className="skeleton h-24 !rounded-xl" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1152px] px-8 py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] !rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
