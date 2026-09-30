"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialAttendanceFormState } from "@/lib/attendance/form-state";
import { checkInMemberAction } from "@/server/actions/attendance";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Checking in…" : "Check in"}</button>;
}

export function CheckInMemberForm({ memberId, branchId, canOverride, method = "SEARCH" }: { memberId: string; branchId: string; canOverride: boolean; method?: "SEARCH" | "SCANNER" | "QR" }) {
  const [state, formAction] = useActionState(checkInMemberAction, initialAttendanceFormState);
  return <form action={formAction} className="mt-4 space-y-3"><input name="memberId" type="hidden" value={memberId} /><input name="branchId" type="hidden" value={branchId} /><input name="method" type="hidden" value={method} />
    {canOverride ? <div><label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor={`override-${memberId}`}>Override reason (only needed if access is blocked)</label><input className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" id={`override-${memberId}`} maxLength={500} name="overrideReason" placeholder="Reason for authorized override" /></div> : null}
    <div className="flex flex-wrap items-center gap-3"><SubmitButton />{state.status === "success" ? <p className="text-sm font-medium text-[var(--brand)]" role="status">{state.message}</p> : null}{state.status === "error" ? <p className="text-sm text-[var(--danger)]" role="alert">{state.message}</p> : null}</div>
  </form>;
}
