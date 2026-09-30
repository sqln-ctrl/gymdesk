import Link from "next/link";

import { MembershipPlanStatusForm } from "@/components/memberships/membership-plan-status-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listMembershipPlans } from "@/server/services/memberships";

export default async function MembershipPlansPage() {
  const user = await requireCurrentUser();
  const canManage = hasPermission(user, "membership.plan.manage");
  const plans = await listMembershipPlans(user);
  if (!canManage) return <EmptyState title="Plan access is restricted" description="Your account does not have permission to manage membership plans." />;

  return <div className="space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Membership management</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Membership plans</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Configure prices, duration, freeze allowances, and grace periods.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href="/memberships">Memberships</Link></Button><Button asChild><Link href="/memberships/plans/new">Create plan</Link></Button></div></section>
    {plans.length === 0 ? <EmptyState title="No membership plans" description="Create an active plan before selling memberships." /> : <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Duration</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Rules</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y">{plans.map((plan) => <tr key={plan.id}><td className="px-5 py-4"><p className="font-semibold">{plan.name}</p>{plan.description ? <p className="mt-1 max-w-xs text-xs text-[var(--muted-foreground)]">{plan.description}</p> : null}</td><td className="px-5 py-4">{plan.durationLabel}</td><td className="px-5 py-4 tabular-nums">{formatMoney(plan.priceMinor + plan.registrationFeeMinor)}</td><td className="px-5 py-4 text-[var(--muted-foreground)]">{plan.freezeDaysAllowed} freeze days · {plan.graceDays} grace days</td><td className="px-5 py-4"><span className={plan.isActive ? "font-medium text-[var(--brand)]" : "font-medium text-[var(--muted-foreground)]"}>{plan.isActive ? "Active" : "Inactive"}</span></td><td className="px-5 py-4"><div className="flex items-center gap-3"><Link className="text-xs font-semibold text-[var(--brand)] hover:underline" href={`/memberships/plans/${plan.id}/edit`}>Edit</Link><MembershipPlanStatusForm isActive={plan.isActive} planId={plan.id} /></div></td></tr>)}</tbody></table></div></section>}
  </div>;
}
