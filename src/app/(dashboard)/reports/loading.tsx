export default function ReportsLoading() {
  return (
    <div aria-label="Loading reports" className="space-y-6">
      <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div className="h-32 animate-pulse rounded-xl bg-slate-200" key={item} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2"><div className="h-72 animate-pulse rounded-xl bg-slate-200" /><div className="h-72 animate-pulse rounded-xl bg-slate-200" /></div>
    </div>
  );
}
