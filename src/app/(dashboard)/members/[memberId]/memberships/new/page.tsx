import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MembershipSaleForm } from "@/components/memberships/membership-sale-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMembershipSaleOptions } from "@/server/services/memberships";

type PageProps = { params: Promise<{ memberId: string }> };

export default async function NewMemberMembershipPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "membership.sell")) redirect("/members");
  const { memberId } = await params;
  const options = await getMembershipSaleOptions(user, memberId);
  if (!options) notFound();
  const today = new Date().toISOString().slice(0, 10);
  return <div className="mx-auto max-w-2xl space-y-6"><section className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[var(--brand)]">{options.memberName}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Create membership</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Pricing and expiry are calculated securely from the selected plan.</p></div><Button asChild variant="secondary"><Link href={`/members/${memberId}`}>Cancel</Link></Button></section><section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><MembershipSaleForm branch={options.branch} memberId={memberId} plans={options.plans} today={today} /></section></div>;
}
