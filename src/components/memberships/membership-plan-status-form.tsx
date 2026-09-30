"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMembershipFormState } from "@/lib/memberships/form-state";
import { setMembershipPlanActiveAction } from "@/server/actions/memberships";

function SubmitButton({ activate }: { activate: boolean }) {
  const { pending } = useFormStatus();
  return <button className="text-xs font-semibold text-[var(--brand)] hover:underline disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving…" : activate ? "Reactivate" : "Deactivate"}</button>;
}

export function MembershipPlanStatusForm({ planId, isActive }: { planId: string; isActive: boolean }) {
  const action = setMembershipPlanActiveAction.bind(null, planId, !isActive);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  return <form action={formAction} className="flex items-center gap-2" onSubmit={(event) => {
    if (!isActive) return;
    if (!window.confirm("Deactivate this plan? Existing memberships will be preserved.")) event.preventDefault();
  }}><SubmitButton activate={!isActive} />{state.message ? <span className="text-xs text-[var(--danger)]" role="alert">{state.message}</span> : null}</form>;
}
