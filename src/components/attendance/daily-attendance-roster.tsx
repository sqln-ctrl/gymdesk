"use client";

import { useActionState, useState } from "react";

import { initialAttendanceFormState } from "@/lib/attendance/form-state";
import { saveDailyAttendanceAction } from "@/server/actions/attendance";

type RosterEntry = { id: string; memberCode: string; fullName: string; status: "PRESENT" | "ABSENT" };

export function DailyAttendanceRoster({ branchId, attendanceDate, roster }: { branchId: string; attendanceDate: string; roster: RosterEntry[] }) {
  const [statuses, setStatuses] = useState(() => Object.fromEntries(roster.map((member) => [member.id, member.status])) as Record<string, "PRESENT" | "ABSENT">);
  const [state, action, pending] = useActionState(saveDailyAttendanceAction, initialAttendanceFormState);
  const presentCount = Object.values(statuses).filter((status) => status === "PRESENT").length;
  return <form action={action} className="rounded-xl border bg-[var(--surface)]"><input name="branchId" type="hidden" value={branchId} /><input name="attendanceDate" type="hidden" value={attendanceDate} /><input name="entriesJson" type="hidden" value={JSON.stringify(roster.map((member) => ({ memberId: member.id, status: statuses[member.id] ?? "ABSENT" })))} />
    <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Daily attendance roster</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{roster.length} active members · {presentCount} marked present</p></div><button className="h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || roster.length === 0} type="submit">{pending ? "Saving..." : "Save attendance"}</button></div>
    {state.message ? <p className={`mx-5 mt-4 rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`} role="status">{state.message}</p> : null}
    {roster.length === 0 ? <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">No active members at this branch.</p> : <ul className="divide-y">{roster.map((member, index) => <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={member.id}><div><p className="font-medium">{index + 1}. {member.fullName}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{member.memberCode}</p></div><fieldset className="flex gap-2"><legend className="sr-only">Attendance for {member.fullName}</legend><label className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${statuses[member.id] === "PRESENT" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "bg-white"}`}><input checked={statuses[member.id] === "PRESENT"} className="sr-only" name={`status-${member.id}`} onChange={() => setStatuses((current) => ({ ...current, [member.id]: "PRESENT" }))} type="radio" />Present</label><label className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${statuses[member.id] === "ABSENT" ? "border-red-400 bg-red-50 text-red-800" : "bg-white"}`}><input checked={statuses[member.id] === "ABSENT"} className="sr-only" name={`status-${member.id}`} onChange={() => setStatuses((current) => ({ ...current, [member.id]: "ABSENT" }))} type="radio" />Absent</label></fieldset></li>)}</ul>}</form>;
}
