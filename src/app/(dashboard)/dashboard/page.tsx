import Link from "next/link";

import { MetricTrend } from "@/components/reports/metric-trend";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { formatOperationalDate, formatOperationalDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireCurrentUser } from "@/lib/permissions/guards";
import { getDashboard } from "@/server/services/dashboard";

function date(value: Date, timezone: string): string {
  return formatOperationalDate(value, timezone);
}

function dateTime(value: Date, timezone: string): string {
  return formatOperationalDateTime(value, timezone);
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const dashboard = await getDashboard(user);

  if (dashboard.kind === "management") {
    const { reports } = dashboard;
    const { operational, finance } = reports;
    return (
      <div className="space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-[var(--brand)]">Gym operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">A live view of the last 30 calendar days across your accessible branches.</p></div>
          <Button asChild variant="secondary"><Link href="/reports">Open full reports</Link></Button>
        </section>
        {operational ? <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard description="Members with current, usable membership coverage." href="/members" label="Active members" value={operational.members.activeMemberships} />
            <StatCard description="Visits recorded throughout this 30-day period." href="/attendance" label="Check-ins" value={operational.attendance.totalCheckIns} />
            <StatCard description="Active memberships ending in the next 30 days." href="/memberships/expiry" label="Expiring soon" value={operational.members.expiringMemberships} />
            <StatCard description="New member records in the period." href="/members" label="New members" value={operational.members.newJoins} />
          </section>
          <section className="grid gap-6 xl:grid-cols-2">
            <MetricTrend description="Daily visits across your accessible branches." title="Attendance trend" valueLabel="check-ins" values={operational.attendance.daily} />
            <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Membership expiry watch</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">The next memberships requiring follow-up.</p></div><Link className="text-sm font-semibold text-[var(--brand)] hover:underline" href="/memberships/expiry">View all</Link></div>{operational.members.expiring.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No memberships are expiring in the next 30 days.</p> : <ul className="divide-y">{operational.members.expiring.slice(0, 5).map((membership) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={membership.id}><div><Link className="font-medium hover:underline" href={`/members/${membership.memberId}`}>{membership.memberName}</Link><p className="mt-1 text-xs text-[var(--muted-foreground)]">{membership.planName} · {membership.branchName}</p></div><time className="text-sm font-semibold tabular-nums">{date(membership.endDate, reports.timezone)}</time></li>)}</ul>}</section>
          </section>
          {operational.maintenance.overdue.length > 0 ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">Maintenance attention needed</h2><p className="mt-1 text-sm text-amber-800">{operational.maintenance.overdue.map((equipment) => `${equipment.name} (${equipment.assetCode})`).join(", ")} have service dates due or overdue.</p><Link className="mt-3 inline-block text-sm font-semibold text-amber-900 underline" href="/equipment">Open equipment</Link></section> : null}
        </> : <EmptyState description="Your account has financial report access but not the operational metrics needed for this dashboard." title="Operational dashboard is restricted" />}
        {finance ? <section className="grid gap-3 sm:grid-cols-3"><StatCard description="Payments received in the last 30 days." href="/reports" label="Gross collections" value={formatMoney(finance.grossMinor, reports.currency)} /><StatCard description="Refunds issued in the last 30 days." href="/reports" label="Refunded" value={formatMoney(finance.refundedMinor, reports.currency)} /><StatCard description={`${finance.outstandingInvoices} unpaid or partially paid invoices.`} href="/invoices" label="Outstanding dues" value={formatMoney(finance.outstandingMinor, reports.currency)} /></section> : null}
      </div>
    );
  }

  if (dashboard.kind === "trainer") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Trainer workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Today&apos;s coaching plan</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Keep assigned members, workout plans, and progress follow-ups moving.</p></div><Button asChild><Link href="/workouts">Manage workout plans</Link></Button></section>
        <section className="grid gap-3 sm:grid-cols-2"><StatCard description="Members currently assigned to you." href="/members" label="Assigned members" value={dashboard.assignedMembers} /><StatCard description="Assigned members with no active workout plan." href="/workouts" label="Plans to create" value={dashboard.membersWithoutActivePlan} /></section>
        <section className="grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Today&apos;s classes</h2></div>{dashboard.todayClasses.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No classes assigned to you today.</p> : <ul className="divide-y">{dashboard.todayClasses.map((session) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={session.id}><div><p className="font-medium">{session.className}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{session.branchName} · {session.bookedCount}/{session.capacity} booked</p></div><time className="text-sm">{dateTime(session.startsAt, dashboard.timezone)}</time></li>)}</ul>}</section>
          <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Recent progress entries</h2></div>{dashboard.recentProgress.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">Progress entries will appear here after you record a measurement.</p> : <ul className="divide-y">{dashboard.recentProgress.map((entry) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={entry.id}><Link className="font-medium hover:underline" href={`/members/${entry.memberId}/progress`}>{entry.memberName}</Link><time className="text-sm text-[var(--muted-foreground)]">{date(entry.recordedAt, dashboard.timezone)}</time></li>)}</ul>}</section>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Front desk</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Ready for today</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Keep arrivals, renewals, and upcoming classes moving.</p></div><div className="flex gap-2"><Button asChild><Link href="/attendance">Check in member</Link></Button><Button asChild variant="secondary"><Link href="/members/new">Add member</Link></Button></div></section>
      <section className="grid gap-3 sm:grid-cols-2"><StatCard description="Check-ins recorded across your branches today." href="/attendance" label="Today&apos;s check-ins" value={dashboard.todayCheckIns} />{dashboard.outstandingMinor !== null ? <StatCard description="Current unpaid and partially paid balances." href="/invoices" label="Pending dues" value={formatMoney(dashboard.outstandingMinor, dashboard.currency)} /> : <StatCard description="Payment totals are not available to this account." label="Pending dues" value="Restricted" />}</section>
      <section className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Expiring memberships</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Members to contact in the next 30 days.</p></div>{dashboard.expiring.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No expiring memberships in your branches.</p> : <ul className="divide-y">{dashboard.expiring.map((membership) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={membership.id}><div><Link className="font-medium hover:underline" href={`/members/${membership.memberId}`}>{membership.memberName}</Link><p className="mt-1 text-xs text-[var(--muted-foreground)]">{membership.planName}</p></div><time className="text-sm font-semibold">{date(membership.endDate, dashboard.timezone)}</time></li>)}</ul>}</section>
        <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Today&apos;s classes</h2></div>{dashboard.upcomingClasses.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No classes scheduled in your branches today.</p> : <ul className="divide-y">{dashboard.upcomingClasses.map((session) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={session.id}><div><p className="font-medium">{session.className}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{session.branchName} · {session.bookedCount}/{session.capacity} booked</p></div><time className="text-sm">{dateTime(session.startsAt, dashboard.timezone)}</time></li>)}</ul>}</section>
      </section>
    </div>
  );
}
