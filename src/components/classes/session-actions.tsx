"use client";

import { useActionState } from "react";

import { initialClassFormState } from "@/lib/classes/form-state";
import { bookMemberIntoClassAction, cancelClassBookingAction, recordClassAttendanceAction } from "@/server/actions/classes";

export function SessionBookingForm({ sessionId, branchId, members }: { sessionId: string; branchId: string; members: Array<{ id: string; primaryBranchId: string; firstName: string; lastName: string; memberCode: string }> }) {
  const [state, action, pending] = useActionState(bookMemberIntoClassAction, initialClassFormState);
  const branchMembers = members.filter((member) => member.primaryBranchId === branchId);
  return <form action={action} className="mt-3 flex flex-wrap items-center gap-2"><input name="sessionId" type="hidden" value={sessionId} /><select className="h-9 min-w-48 rounded border bg-white px-2 text-xs" defaultValue="" name="memberId" required><option disabled value="">Book a member</option>{branchMembers.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} · {member.memberCode}</option>)}</select><button className="rounded border px-3 py-2 text-xs font-semibold disabled:opacity-50" disabled={pending} type="submit">Reserve place</button>{state.message ? <span className={`text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>{state.message}</span> : null}</form>;
}

export function BookingActions({ bookingId, canManage }: { bookingId: string; canManage: boolean }) {
  const cancel = cancelClassBookingAction.bind(null, bookingId);
  const attended = recordClassAttendanceAction.bind(null, bookingId, "ATTENDED");
  const noShow = recordClassAttendanceAction.bind(null, bookingId, "NO_SHOW");
  const [cancelState, cancelAction, cancelling] = useActionState(cancel, initialClassFormState);
  const [attendanceState, attendedAction, attending] = useActionState(attended, initialClassFormState);
  const [, noShowAction, markingNoShow] = useActionState(noShow, initialClassFormState);
  return <div className="mt-2 flex flex-wrap items-center gap-2"><form action={cancelAction}><button className="rounded border px-2 py-1 text-xs disabled:opacity-50" disabled={cancelling} type="submit">Cancel</button></form>{canManage ? <><form action={attendedAction}><button className="rounded border px-2 py-1 text-xs disabled:opacity-50" disabled={attending} type="submit">Attended</button></form><form action={noShowAction}><button className="rounded border px-2 py-1 text-xs disabled:opacity-50" disabled={markingNoShow} type="submit">No-show</button></form></> : null}{(cancelState.message || attendanceState.message) ? <span className="text-xs text-[var(--muted-foreground)]">{cancelState.message ?? attendanceState.message}</span> : null}</div>;
}
