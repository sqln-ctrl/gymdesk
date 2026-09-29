import { EmptyState } from "@/components/shared/empty-state";

const setupItems = [
  ["Database", "SQLite schema and migration baseline"],
  ["Access", "Roles, permissions, and staff authentication"],
  ["Operations", "Members, memberships, billing, and check-in"],
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Gym operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Your workspace is ready for its first gym, branch, and staff account.
          </p>
        </div>
        <span className="w-fit rounded-full border bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
          Setup in progress
        </span>
      </section>

      <section aria-label="Foundation progress" className="grid gap-4 md:grid-cols-3">
        {setupItems.map(([title, description], index) => (
          <article className="rounded-xl border bg-[var(--surface)] p-5" key={title}>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold text-[var(--muted-foreground)]">
                {index + 1}
              </span>
              <h2 className="font-semibold">{title}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          </article>
        ))}
      </section>

      <EmptyState
        title="No operational data yet"
        description="Once the initial organization and branch are created, this dashboard will show live member, attendance, membership, and revenue metrics."
      />
    </div>
  );
}
