import { logoutAction } from "@/server/actions/auth";
import type { CurrentUser } from "@/lib/auth/session";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TopBar({ user }: { user: CurrentUser }) {
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
          {user.branchIds.length} assigned {user.branchIds.length === 1 ? "branch" : "branches"}
        </span>
        <div className="flex items-center gap-2">
          <div aria-label={`Current user ${user.name}`} className="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {getInitials(user.name)}
          </div>
          <form action={logoutAction}>
            <button className="hidden rounded-lg px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] sm:block" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
