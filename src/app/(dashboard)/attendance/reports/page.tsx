import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getAttendanceReport, getAttendanceReportBranchOptions } from "@/server/services/attendance";

type PageProps = { searchParams: Promise<{ branchId?: string; days?: string }> };

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00.000Z`));
}

export default async function AttendanceReportsPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "report.read")) redirect("/dashboard");

  const query = await searchParams;
  const branches = await getAttendanceReportBranchOptions(user);
  const branchId = query.branchId && branches.some((branch) => branch.id === query.branchId)
    ? query.branchId
    : undefined;
  const requestedDays = Number(query.days);
  const days = [7, 14, 30].includes(requestedDays) ? requestedDays : 7;
  const report = await getAttendanceReport(user, { branchId, days });
  if (!report) redirect("/dashboard");
  const maxDaily = Math.max(...report.daily.map((item) => item.count), 1);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Operations report</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Attendance</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Check-ins and peak UTC hours for the selected range.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/attendance">Check in member</Link></Button>
      </section>

      <form className="flex flex-col gap-3 rounded-xl border bg-[var(--surface)] p-4 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-sm font-medium">Branch
          <select className="h-10 rounded-lg border bg-[var(--surface)] px-3 font-normal" defaultValue={branchId ?? ""} name="branchId">
            <option value="">All accessible branches</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">Range
          <select className="h-10 rounded-lg border bg-[var(--surface)] px-3 font-normal" defaultValue={String(days)} name="days">
            <option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option>
          </select>
        </label>
        <Button type="submit">Apply filters</Button>
      </form>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border bg-[var(--surface)] p-5"><p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Check-ins</p><p className="mt-2 text-3xl font-semibold tabular-nums">{report.totalCheckIns}</p></article>
        <article className="rounded-xl border bg-[var(--surface)] p-5"><p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Unique members</p><p className="mt-2 text-3xl font-semibold tabular-nums">{report.uniqueMembers}</p></article>
      </section>

      <section className="rounded-xl border bg-[var(--surface)] p-5">
        <h2 className="font-semibold">Daily check-ins</h2>
        {report.totalCheckIns === 0 ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">No check-ins in this range.</p> : (
          <div className="mt-5 space-y-3">
            {report.daily.map((item) => <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm" key={item.date}><span className="text-[var(--muted-foreground)]">{dateLabel(item.date)}</span><div aria-label={`${item.count} check-ins on ${item.date}`} className="h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(item.count / maxDaily) * 100}%` }} /></div><span className="text-right font-medium tabular-nums">{item.count}</span></div>)}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-[var(--surface)] p-5">
        <h2 className="font-semibold">Peak hours (UTC)</h2>
        {report.peakHours.length === 0 ? <EmptyState title="No peak hours yet" description="Peak hours appear after check-ins are recorded." /> : <ol className="mt-4 space-y-2">{report.peakHours.map((item) => <li className="flex items-center justify-between border-b pb-2 text-sm last:border-0" key={item.hour}><span>{String(item.hour).padStart(2, "0")}:00–{String(item.hour).padStart(2, "0")}:59</span><span className="font-semibold tabular-nums">{item.count} check-ins</span></li>)}</ol>}
      </section>
    </div>
  );
}
