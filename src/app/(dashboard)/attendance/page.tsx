import Link from "next/link";

import { CheckInMemberForm } from "@/components/attendance/check-in-member-form";
import { EmptyState } from "@/components/shared/empty-state";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getAttendanceBranchOptions, listRecentCheckIns, searchCheckInMembers } from "@/server/services/attendance";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("en-PK", { hour: "2-digit", minute: "2-digit" }).format(value);
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "attendance.checkin")) return <EmptyState title="Attendance access is restricted" description="Your account does not have permission to check in members." />;
  const params = await searchParams;
  const branches = await getAttendanceBranchOptions(user);
  const branchId = valueOf(params.branchId) && branches.some((branch) => branch.id === valueOf(params.branchId)) ? valueOf(params.branchId)! : branches[0]?.id;
  const query = valueOf(params.q)?.slice(0, 100) ?? "";
  const [members, recent] = branchId ? await Promise.all([searchCheckInMembers(user, branchId, query), listRecentCheckIns(user, branchId)]) : [[], []];
  const canOverride = hasPermission(user, "attendance.override");

  return <div className="mx-auto max-w-5xl space-y-6"><section><p className="text-sm font-medium text-[var(--brand)]">Front desk</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Check in member</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Search by member code, name, or phone. Scanner input works as keyboard input—scan, then press Enter.</p></section>
    {branches.length === 0 ? <EmptyState title="No accessible branches" description="Ask an administrator to assign you to an active branch before checking in members." /> : <><form className="grid gap-3 rounded-xl border bg-[var(--surface)] p-4 sm:grid-cols-[220px_minmax(0,1fr)_auto]" method="get"><div><label className="sr-only" htmlFor="attendance-branch">Branch</label><select className="h-12 w-full rounded-lg border bg-white px-3 text-sm" defaultValue={branchId} id="attendance-branch" name="branchId">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></div><div><label className="sr-only" htmlFor="attendance-search">Search member</label><input autoFocus className="h-12 w-full rounded-lg border bg-white px-4 text-base" defaultValue={query} id="attendance-search" maxLength={100} name="q" placeholder="Scan member code or search name / phone" type="search" /></div><button className="h-12 rounded-lg border bg-[var(--surface)] px-5 text-sm font-semibold hover:bg-[var(--surface-muted)]" type="submit">Find member</button></form>
      {query && members.length === 0 ? <EmptyState title="No matching member" description="Check the selected branch and try a member code, name, or phone number." /> : null}
      {members.length > 0 && branchId ? <section className="space-y-3"><h2 className="text-lg font-semibold">Matching members</h2>{members.map((member) => <article className="rounded-xl border bg-[var(--surface)] p-5" key={member.id}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/members/${member.id}`}>{member.fullName}</Link><p className="mt-1 text-sm text-[var(--muted-foreground)]">{member.memberCode}{member.phone ? ` · ${member.phone}` : ""}</p></div><span className="text-sm font-medium">{member.status}</span></div><CheckInMemberForm branchId={branchId} canOverride={canOverride} memberId={member.id} /></article>)}</section> : null}
      <section className="rounded-xl border bg-[var(--surface)]"><div className="border-b px-5 py-4"><h2 className="font-semibold">Recent check-ins</h2></div>{recent.length === 0 ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No check-ins recorded for this branch yet.</p> : <ul className="divide-y">{recent.map((entry) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={entry.id}><div><Link className="font-medium hover:underline" href={`/members/${entry.memberId}`}>{entry.memberName}</Link><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{entry.memberCode}{entry.wasOverridden ? " · Override" : ""}</p></div><time className="text-sm tabular-nums text-[var(--muted-foreground)]">{formatTime(entry.checkInAt)}</time></li>)}</ul>}</section></>}</div>;
}
