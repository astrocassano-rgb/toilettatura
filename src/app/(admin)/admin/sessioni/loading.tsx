export default function AdminGenericLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <header className="flex flex-col gap-2">
        <div className="h-3 w-32 rounded-full bg-slate-800" />
        <div className="h-8 w-48 rounded-full bg-slate-800" />
        <div className="h-4 w-72 rounded-full bg-slate-800" />
      </header>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 min-h-[400px]" />
    </div>
  );
}
