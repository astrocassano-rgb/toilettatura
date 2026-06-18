export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <header className="flex flex-col gap-2">
        <div className="h-3 w-32 rounded-full bg-slate-800" />
        <div className="h-8 w-48 rounded-full bg-slate-800" />
        <div className="h-4 w-72 rounded-full bg-slate-800" />
      </header>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800" />
            </div>
            <div className="mt-4">
              <div className="h-4 w-20 rounded-full bg-slate-800" />
              <div className="mt-2 h-8 w-16 rounded-full bg-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links Skeleton */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-6 h-6 w-40 rounded-full bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex h-[72px] items-center rounded-2xl border border-slate-800 bg-slate-950 p-4" />
          ))}
        </div>
      </div>
      
      {/* Chart Skeleton */}
      <div className="h-[300px] rounded-3xl border border-slate-800 bg-slate-900/50 p-6" />
    </div>
  );
}
