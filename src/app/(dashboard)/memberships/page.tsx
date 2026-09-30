import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { MEMBERSHIP_STATUS_LABELS, listMemberships } from "@/server/services/memberships";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function MembershipsPage() {
  const user = await requireCurrentUser();
  const memberships = await listMemberships(user);
  const canManagePlans = hasPermission(user, "membership.plan.manage");

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Membership management</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Memberships</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Track plan coverage, expiry, and membership status across your branches.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href="/memberships/expiry">Expiry watchlist</Link></Button>{canManagePlans ? <Button asChild variant="secondary"><Link href="/memberships/plans">Manage plans</Link></Button> : null}</div></section>
    {memberships.length === 0 ? <EmptyState title="No memberships yet" description="Sell a membership from a member profile after creating an active plan." /> : <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Period</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Total</th></tr></thead><tbody className="divide-y">{memberships.map((membership) => <tr key={membership.id}><td className="px-5 py-4"><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/members/${membership.memberId}`}>{membership.memberName}</Link><p className="text-xs text-[var(--muted-foreground)]">{membership.memberCode}</p></td><td className="px-5 py-4 font-medium">{membership.planName}</td><td className="px-5 py-4">{membership.branchName}</td><td className="px-5 py-4 text-[var(--muted-foreground)]">{formatDate(membership.startDate)} – {formatDate(membership.endDate)}</td><td className="px-5 py-4"><span className="font-medium">{MEMBERSHIP_STATUS_LABELS[membership.status]}</span></td><td className="px-5 py-4 tabular-nums">{formatMoney(membership.totalMinor)}</td></tr>)}</tbody></table></div></section>}
  </div>;
}
