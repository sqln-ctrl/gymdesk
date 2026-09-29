export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-32 animate-pulse rounded-xl bg-slate-200" key={item} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
