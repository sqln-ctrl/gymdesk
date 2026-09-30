import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MembershipPlanForm } from "@/components/memberships/membership-plan-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMembershipPlan, getMembershipPlanFormOptions } from "@/server/services/memberships";

type PageProps = { params: Promise<{ planId: string }> };

export default async function EditMembershipPlanPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "membership.plan.manage")) redirect("/memberships");
  const { planId } = await params;
  const [plan, gyms] = await Promise.all([getMembershipPlan(user, planId), getMembershipPlanFormOptions(user)]);
  if (!plan) notFound();
  return <div className="mx-auto max-w-3xl space-y-6"><section className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[var(--brand)]">Membership plans</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Edit {plan.name}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Changes apply to future sales; existing memberships retain their captured prices.</p></div><Button asChild variant="secondary"><Link href="/memberships/plans">Cancel</Link></Button></section><section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><MembershipPlanForm gyms={gyms} plan={plan} /></section></div>;
}
