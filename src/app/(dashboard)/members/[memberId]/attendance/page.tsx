import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listMemberAttendance } from "@/server/services/attendance";
import { getMemberDetail } from "@/server/services/members";

type PageProps = { params: Promise<{ memberId: string }> };

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function MemberAttendancePage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.read")) redirect("/dashboard");
  const { memberId } = await params;
  const [member, attendance] = await Promise.all([getMemberDetail(user, memberId), listMemberAttendance(user, memberId)]);
  if (!member) notFound();
  return <div className="mx-auto max-w-4xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">{member.memberCode}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{member.firstName} {member.lastName} attendance</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">The latest 50 check-ins are shown.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href={`/members/${memberId}`}>Profile</Link></Button>{hasPermission(user, "attendance.checkin") ? <Button asChild><Link href={`/attendance?q=${encodeURIComponent(member.memberCode)}&branchId=${member.branch.id}`}>Check in</Link></Button> : null}</div></section><section className="overflow-hidden rounded-xl border bg-[var(--surface)]">{attendance.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">No attendance records yet.</p> : <ul className="divide-y">{attendance.map((entry) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={entry.id}><div><p className="font-medium">{formatDateTime(entry.checkInAt)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{entry.method}{entry.wasOverridden ? " · Authorized override" : ""}</p></div></li>)}</ul>}</section></div>;
}
