const navigationGroups = [
  ["Overview"],
  ["Members", "Memberships", "Attendance", "Billing"],
  ["Trainers & staff", "Workouts", "Classes", "Equipment"],
  ["Reports", "Settings"],
] as const;

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-3 pb-7">
        <div className="grid size-9 place-items-center rounded-xl bg-[var(--brand)] font-bold text-white">
          G
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight">GymFlow</p>
          <p className="text-xs text-[var(--muted-foreground)]">Operations</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="space-y-5">
        {navigationGroups.map((group) => (
          <div key={group[0]} className="space-y-1">
            {group.map((item) => (
              <span
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  item === "Overview"
                    ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "text-[var(--muted-foreground)]"
                }`}
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border bg-[var(--surface-muted)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Environment
        </p>
        <p className="mt-1 text-sm font-medium">Local development</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
          SQLite is active for the first build.
        </p>
      </div>
    </aside>
  );
}
