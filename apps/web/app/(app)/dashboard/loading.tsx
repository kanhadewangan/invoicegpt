export default function Loading() {
  return (
    <div className="space-y-6" aria-label="Loading invoices">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-shimmer rounded-lg" />
          <div className="h-4 w-64 animate-shimmer rounded" />
        </div>
        <div className="h-10 w-36 animate-shimmer rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[118px] rounded-2xl border border-line bg-surface" />
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-surface">
        <div className="h-12 border-b border-line" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-0">
            <div className="size-9 animate-shimmer rounded-full" />
            <div className="h-4 w-48 animate-shimmer rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
