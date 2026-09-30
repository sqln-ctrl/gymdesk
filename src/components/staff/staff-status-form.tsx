"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialStaffFormState } from "@/lib/staff/form-state";
import { setStaffStatusAction } from "@/server/actions/staff";

function StatusButton({ deactivate }: { deactivate: boolean }) {
  const { pending } = useFormStatus();
  return <button className={deactivate ? "h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50" : "h-10 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50"} disabled={pending} type="submit">{pending ? "Updating..." : deactivate ? "Deactivate account" : "Reactivate account"}</button>;
}

export function StaffStatusForm({ staffId, status }: { staffId: string; status: string }) {
  const deactivate = status === "ACTIVE";
  const action = setStaffStatusAction.bind(null, staffId, deactivate ? "INACTIVE" : "ACTIVE");
  const [state, formAction] = useActionState(action, initialStaffFormState);
  return <form action={formAction} className="flex flex-wrap items-center gap-3" onSubmit={(event) => { if (deactivate && !window.confirm("Deactivate this staff account and end active sessions?")) event.preventDefault(); }}><StatusButton deactivate={deactivate} />{state.message ? <p className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>{state.message}</p> : null}</form>;
}
