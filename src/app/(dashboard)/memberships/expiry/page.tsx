import Link from "next/link";

import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listExpiringMemberships, listMemberships } from "@/server/services/memberships";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function MembershipRows({ items, emptyMessage }: { items: Awaited<ReturnType<typeof listMemberships>>; emptyMessage: string }) {
  return items.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">{emptyMessage}</p> : <ul className="divide-y">{items.map((membership) => <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={membership.id}><div><Link className="font-medium text-[var(--brand)] hover:underline" href={`/members/${membership.memberId}/memberships`}>{membership.memberName}</Link><p className="mt-1 text-xs text-[var(--muted-foreground)]">{membership.memberCode} · {membership.planName}</p></div><time className="text-sm font-medium tabular-nums">{formatDate(membership.endDate)}</time></li>)}</ul>;
}

export default async function MembershipExpiryPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.read")) return null;
  const [expiring, expired] = await Promise.all([listExpiringMemberships(user), listMemberships(user, "EXPIRED")]);
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Membership management</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Expiry watchlist</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Active memberships ending in the next 30 days and all expired memberships.</p></div><Button asChild variant="secondary"><Link href="/memberships">All memberships</Link></Button></section><section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Expiring in 30 days</h2></div><MembershipRows emptyMessage="No memberships are expiring in the next 30 days." items={expiring} /></section><section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Expired memberships</h2></div><MembershipRows emptyMessage="No expired memberships." items={expired} /></section></div>;
}
