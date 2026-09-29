export function TopBar() {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white lg:hidden">
          G
        </div>
        <div>
          <p className="text-sm font-semibold">GymFlow</p>
          <p className="text-xs text-[var(--muted-foreground)]">Local development workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] sm:inline-flex">
          No branch selected
        </span>
        <div aria-label="Current user not configured" className="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
          --
        </div>
      </div>
    </header>
  );
}
