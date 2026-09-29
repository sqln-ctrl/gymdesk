import { EmptyState } from "@/components/shared/empty-state";
import { requireCurrentUser } from "@/lib/permissions/guards";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Gym operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Your staff workspace is protected with server-side access controls.
          </p>
        </div>
        <span className="w-fit rounded-full border bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
          {user.roleKeys[0] ?? "STAFF"}
        </span>
      </section>

      <section aria-label="Access summary" className="grid gap-4 md:grid-cols-3">
        {[
          ["Assigned branches", String(user.branchIds.length), "Data is scoped to your branch access."],
          ["Active permissions", String(user.permissionKeys.length), "Permissions are enforced on the server."],
          ["Account", "Active", user.email],
        ].map(([title, value, description], index) => (
          <article className="rounded-xl border bg-[var(--surface)] p-5" key={title}>
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold text-[var(--muted-foreground)]">
                {index + 1}
              </span>
              <h2 className="font-semibold">{title}</h2>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          </article>
        ))}
      </section>

      <EmptyState
        title="Member operations are next"
        description="Member management will add the first live operational records, searches, profiles, and branch-scoped workflows to this dashboard."
      />
    </div>
  );
}
