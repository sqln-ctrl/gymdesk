import Link from "next/link";
import { redirect } from "next/navigation";

import { MetricTrend } from "@/components/reports/metric-trend";
import { ReportFilters } from "@/components/reports/report-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/billing/constants";
import { formatOperationalDate, formatOperationalDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { parseReportDateRange } from "@/lib/reports/filters";
import { requireCurrentUser } from "@/lib/permissions/guards";
import { getReportBranchOptions, getReports } from "@/server/services/reports";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function csvHref(kind: string, start: string, end: string, branchId?: string): string {
  const query = new URLSearchParams({ kind, start, end });
  if (branchId) query.set("branchId", branchId);
  return `/api/reports/export?${query.toString()}`;
}

function reportDate(value: Date, timezone: string): string {
  return formatOperationalDate(value, timezone);
}

function reportDateTime(value: Date, timezone: string): string {
  return formatOperationalDateTime(value, timezone);
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const query = await searchParams;
  const range = parseReportDateRange({ start: valueOf(query.start), end: valueOf(query.end) });
  const branches = await getReportBranchOptions(user);
  const requestedBranchId = valueOf(query.branchId);
  const branchId = requestedBranchId && branches.some((branch) => branch.id === requestedBranchId)
    ? requestedBranchId
    : undefined;
  const reports = await getReports(user, { start: range.start, end: range.end, branchId });
  if (!reports) redirect("/dashboard");

  const operational = reports.operational;
  const finance = reports.finance;
  const filterStart = range.startInput;
  const filterEnd = range.endInput;

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Business intelligence</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Operational and financial performance for the selected branches and dates.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {operational ? <Button asChild size="sm" variant="secondary"><a href={csvHref("operational", filterStart, filterEnd, branchId)}>Export operations CSV</a></Button> : null}
          {operational ? <Button asChild size="sm" variant="secondary"><a href={csvHref("attendance", filterStart, filterEnd, branchId)}>Export attendance CSV</a></Button> : null}
          {operational ? <Button asChild size="sm" variant="secondary"><a href={csvHref("maintenance", filterStart, filterEnd, branchId)}>Export maintenance CSV</a></Button> : null}
          {finance ? <Button asChild size="sm" variant="secondary"><a href={csvHref("financial", filterStart, filterEnd, branchId)}>Export finance CSV</a></Button> : null}
        </div>
      </section>

      <ReportFilters branchId={branchId} branches={branches} end={filterEnd} start={filterStart} />
      <p className="text-xs text-[var(--muted-foreground)]">Dates and peak hours use the gym timezone: {reports.timezone}.</p>

      {operational ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard description={`${operational.members.active} active member records`} href="/members" label="Active memberships" value={operational.members.activeMemberships} />
          <StatCard description={`${operational.members.inactive} inactive, suspended, or archived`} href="/members" label="Members" value={operational.members.total} />
          <StatCard description={`${operational.members.renewals} renewals in this period`} href="/memberships" label="Memberships sold" value={operational.members.membershipsSold} />
          <StatCard description={`${operational.members.expiredMemberships} memberships already expired`} href="/memberships/expiry" label="Expiring in 30 days" value={operational.members.expiringMemberships} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <MetricTrend description="Daily check-ins across the chosen range." title="Attendance trend" valueLabel="check-ins" values={operational.attendance.daily} />
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Member & plan mix</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">New joins and active membership coverage.</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted-foreground)]">New joins</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{operational.members.newJoins}</dd></div>
              <div className="rounded-lg bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted-foreground)]">Active members</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{operational.members.active}</dd></div>
              <div className="rounded-lg bg-[var(--surface-muted)] p-3"><dt className="text-xs text-[var(--muted-foreground)]">Check-ins</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{operational.attendance.totalCheckIns}</dd></div>
            </dl>
            {operational.members.planDistribution.length === 0 ? <p className="mt-5 text-sm text-[var(--muted-foreground)]">Active plan distribution appears after memberships are sold.</p> : <ul className="mt-5 space-y-3">{operational.members.planDistribution.map((plan) => <li className="flex items-center justify-between gap-4 text-sm" key={plan.planName}><span>{plan.planName}</span><span className="font-semibold tabular-nums">{plan.count}</span></li>)}</ul>}
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl border bg-[var(--surface)]">
            <div className="border-b px-5 py-4"><h2 className="font-semibold">Expiring memberships</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Active coverage ending within 30 days.</p></div>
            {operational.members.expiring.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No memberships are expiring soon.</p> : <ul className="divide-y">{operational.members.expiring.map((membership) => <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={membership.id}><div><Link className="font-medium text-[var(--brand)] hover:underline" href={`/members/${membership.memberId}`}>{membership.memberName}</Link><p className="mt-1 text-xs text-[var(--muted-foreground)]">{membership.memberCode} · {membership.planName} · {membership.branchName}</p></div><time className="text-sm font-semibold tabular-nums">{reportDate(membership.endDate, reports.timezone)}</time></li>)}</ul>}
          </section>
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Attendance patterns</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{operational.attendance.uniqueMembers} unique members checked in during this period.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><h3 className="text-sm font-medium">Peak hours</h3>{operational.attendance.peakHours.length === 0 ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">No check-ins yet.</p> : <ol className="mt-3 space-y-2">{operational.attendance.peakHours.map((hour) => <li className="flex justify-between text-sm" key={hour.hour}><span>{String(hour.hour).padStart(2, "0")}:00</span><span className="font-semibold tabular-nums">{hour.count}</span></li>)}</ol>}</div>
              <div><h3 className="text-sm font-medium">Most frequent</h3>{operational.attendance.frequentMembers.length === 0 ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">No check-ins yet.</p> : <ol className="mt-3 space-y-2">{operational.attendance.frequentMembers.slice(0, 5).map((member) => <li className="flex justify-between gap-3 text-sm" key={member.memberId}><Link className="truncate hover:underline" href={`/members/${member.memberId}`}>{member.memberName}</Link><span className="font-semibold tabular-nums">{member.checkIns}</span></li>)}</ol>}</div>
            </div>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Trainer assignments</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{operational.staffing.assignedMembers} members assigned across {operational.staffing.trainers.length} trainers.</p>
            {operational.staffing.trainers.length === 0 ? <p className="mt-5 text-sm text-[var(--muted-foreground)]">No member-trainer assignments in this scope.</p> : <ul className="mt-5 space-y-3">{operational.staffing.trainers.map((trainer) => <li className="flex justify-between text-sm" key={trainer.trainerId}><span>{trainer.trainerName}</span><span className="font-semibold tabular-nums">{trainer.assignedMembers}</span></li>)}</ul>}
          </section>
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Class occupancy</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{operational.classes.booked} reservations from {operational.classes.capacity} available places.</p>
            <p className="mt-5 text-3xl font-semibold tabular-nums">{operational.classes.occupancyPercent}%</p>
            {operational.classes.byClass.length > 0 ? <ul className="mt-5 space-y-3">{operational.classes.byClass.slice(0, 4).map((item) => <li className="flex justify-between gap-3 text-sm" key={item.className}><span className="truncate">{item.className}</span><span className="font-semibold tabular-nums">{item.booked}/{item.capacity}</span></li>)}</ul> : null}
          </section>
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Maintenance</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Recorded service costs in this period.</p>
            <p className="mt-5 text-2xl font-semibold tabular-nums">{formatMoney(operational.maintenance.totalMinor, reports.currency)}</p>
            {operational.maintenance.overdue.length > 0 ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{operational.maintenance.overdue.length} assets need service attention.</p> : <p className="mt-4 text-sm text-[var(--muted-foreground)]">No overdue equipment in this scope.</p>}
          </section>
        </section>
      </> : <EmptyState description="Your account can access financial reports, but not operational reports." title="Operational reports are restricted" />}

      {finance ? <>
        <section className="border-t pt-6"><p className="text-sm font-medium text-[var(--brand)]">Financial reporting</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Collections and dues</h2></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard description="Payments received in the selected dates." label="Gross collections" value={formatMoney(finance.grossMinor, reports.currency)} />
          <StatCard description="Refunds issued in the selected dates." label="Refunded" value={formatMoney(finance.refundedMinor, reports.currency)} />
          <StatCard description="Gross collections less period refunds." label="Net collections" value={formatMoney(finance.netMinor, reports.currency)} />
          <StatCard description={`${finance.outstandingInvoices} unpaid or partially paid invoices.`} href="/invoices" label="Outstanding dues" value={formatMoney(finance.outstandingMinor, reports.currency)} />
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <MetricTrend description="Gross receipts and refunds by calendar day." secondaryLabel="refunds" title="Collections trend" valueLabel="collections" values={finance.daily} />
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Payments by method</h2>
            {finance.paymentsByMethod.length === 0 ? <p className="mt-5 text-sm text-[var(--muted-foreground)]">No payments in this period.</p> : <ul className="mt-5 space-y-4">{finance.paymentsByMethod.map((item) => <li className="flex items-start justify-between gap-4 text-sm" key={item.method}><div><p className="font-medium">{PAYMENT_METHOD_LABELS[item.method as PaymentMethod] ?? item.method}</p>{item.refundedMinor > 0 ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">Refunded {formatMoney(item.refundedMinor, reports.currency)}</p> : null}</div><span className="font-semibold tabular-nums">{formatMoney(item.netMinor, reports.currency)}</span></li>)}</ul>}
          </section>
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="font-semibold">Invoiced membership sales by plan</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Membership invoice line items issued during the selected period.</p>
            {finance.revenueByPlan.length === 0 ? <p className="mt-5 text-sm text-[var(--muted-foreground)]">No membership invoice items in this period.</p> : <ul className="mt-5 space-y-3">{finance.revenueByPlan.map((item) => <li className="flex justify-between gap-4 text-sm" key={item.planName}><span>{item.planName}</span><span className="font-semibold tabular-nums">{formatMoney(item.totalMinor, reports.currency)}</span></li>)}</ul>}
          </section>
          <section className="overflow-hidden rounded-xl border bg-[var(--surface)]">
            <div className="border-b px-5 py-4"><h2 className="font-semibold">Recent payments</h2></div>
            {finance.recentPayments.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No payments in this period.</p> : <ul className="divide-y">{finance.recentPayments.map((payment) => <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={payment.id}><div><Link className="font-medium text-[var(--brand)] hover:underline" href={`/members/${payment.memberId}`}>{payment.memberName}</Link><p className="mt-1 text-xs text-[var(--muted-foreground)]">{payment.invoiceNumber} · {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method} · {reportDateTime(payment.paidAt, reports.timezone)}</p></div><span className="font-semibold tabular-nums">{formatMoney(payment.amountMinor, reports.currency)}</span></li>)}</ul>}
          </section>
        </section>
        <section className="overflow-hidden rounded-xl border bg-[var(--surface)]">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Outstanding dues</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Current balances, ordered from highest to lowest.</p></div>
          {finance.outstanding.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No outstanding balances in this scope.</p> : <div className="overflow-x-auto"><table className="min-w-[700px] w-full text-left text-sm"><thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Issued</th><th className="px-5 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y">{finance.outstanding.map((invoice) => <tr key={invoice.id}><td className="px-5 py-4"><Link className="font-medium text-[var(--brand)] hover:underline" href={`/members/${invoice.memberId}`}>{invoice.memberName}</Link><p className="text-xs text-[var(--muted-foreground)]">{invoice.memberCode}</p></td><td className="px-5 py-4"><Link className="hover:underline" href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td><td className="px-5 py-4">{invoice.branchName}</td><td className="px-5 py-4">{reportDate(invoice.issueDate, reports.timezone)}</td><td className="px-5 py-4 text-right font-semibold tabular-nums">{formatMoney(invoice.balanceMinor, reports.currency)}</td></tr>)}</tbody></table></div>}
        </section>
      </> : null}
    </div>
  );
}
