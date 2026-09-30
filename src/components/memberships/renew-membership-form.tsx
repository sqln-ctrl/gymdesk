"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMembershipFormState } from "@/lib/memberships/form-state";
import { renewMembershipAction } from "@/server/actions/memberships";

function RenewButton() {
  const { pending } = useFormStatus();
  return <button className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Renewing…" : "Renew"}</button>;
}

export function RenewMembershipForm({ memberId, membershipId }: { memberId: string; membershipId: string }) {
  const action = renewMembershipAction.bind(null, memberId, membershipId);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  return <form action={formAction} className="flex items-center gap-2"><RenewButton />{state.message ? <p className="text-xs text-[var(--danger)]" role="alert">{state.message}</p> : null}</form>;
}
