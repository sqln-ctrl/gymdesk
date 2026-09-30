import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RenewMembershipForm } from "@/components/memberships/renew-membership-form";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { MEMBERSHIP_STATUS_LABELS, listMemberships } from "@/server/services/memberships";
import { getMemberDetail } from "@/server/services/members";

type PageProps = { params: Promise<{ memberId: string }> };

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function MemberMembershipsPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.read")) redirect("/dashboard");
  const { memberId } = await params;
  const [member, memberships] = await Promise.all([getMemberDetail(user, memberId), listMemberships(user, undefined, memberId)]);
  if (!member) notFound();
  const canSell = hasPermission(user, "membership.sell");
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">{member.memberCode}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{member.firstName} {member.lastName} memberships</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Membership history is preserved for billing and attendance records.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href={`/members/${memberId}`}>Profile</Link></Button>{canSell ? <Button asChild><Link href={`/members/${memberId}/memberships/new`}>Sell membership</Link></Button> : null}</div></section>
    {memberships.length === 0 ? <section className="rounded-xl border border-dashed bg-[var(--surface)] px-6 py-10 text-center"><h2 className="font-semibold">No memberships yet</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Create a membership to begin tracking access and expiry.</p></section> : <div className="space-y-4">{memberships.map((membership) => <article className="rounded-xl border bg-[var(--surface)] p-5" key={membership.id}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-3"><h2 className="font-semibold">{membership.planName}</h2><span className="text-sm font-medium text-[var(--brand)]">{MEMBERSHIP_STATUS_LABELS[membership.status]}</span></div><p className="mt-2 text-sm text-[var(--muted-foreground)]">{formatDate(membership.startDate)} – {formatDate(membership.endDate)} · {membership.branchName}</p><p className="mt-2 text-sm tabular-nums">{formatMoney(membership.totalMinor)}</p></div>{canSell && membership.status !== "CANCELLED" ? <RenewMembershipForm memberId={memberId} membershipId={membership.id} /> : null}</div></article>)}</div>}
  </div>;
}
