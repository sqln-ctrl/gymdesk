"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { MembershipStatus } from "@/lib/memberships/constants";
import { initialMembershipFormState } from "@/lib/memberships/form-state";
import {
  cancelMembershipAction,
  freezeMembershipAction,
  overrideMembershipExpiryAction,
  unfreezeMembershipAction,
} from "@/server/actions/memberships";

function SubmitButton({ children, danger = false }: { children: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={danger ? "inline-flex h-9 items-center justify-center rounded-lg bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50" : "inline-flex h-9 items-center justify-center rounded-lg border bg-[var(--surface)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-50"} disabled={pending} type="submit">{pending ? "Saving…" : children}</button>;
}

function FormMessage({ message }: { message?: string }) {
  return message ? <p className="text-xs text-[var(--danger)]" role="alert">{message}</p> : null;
}

function FreezeForm({ memberId, membershipId, today }: { memberId: string; membershipId: string; today: string }) {
  const action = freezeMembershipAction.bind(null, memberId, membershipId);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  return <form action={formAction} className="space-y-2 rounded-lg border bg-[var(--surface-muted)] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Freeze membership</p><div className="grid gap-2 sm:grid-cols-2"><input aria-label="Freeze start date" className="h-9 rounded-md border bg-white px-2 text-xs" defaultValue={today} min={today} name="startDate" required type="date" /><input aria-label="Freeze end date" className="h-9 rounded-md border bg-white px-2 text-xs" defaultValue={today} min={today} name="endDate" required type="date" /></div><input aria-label="Freeze reason" className="h-9 w-full rounded-md border bg-white px-2 text-xs" maxLength={500} name="reason" placeholder="Reason for freeze" required /><div className="flex items-center gap-3"><SubmitButton>Freeze</SubmitButton><FormMessage message={state.message} /></div></form>;
}

function UnfreezeForm({ memberId, membershipId }: { memberId: string; membershipId: string }) {
  const action = unfreezeMembershipAction.bind(null, memberId, membershipId);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  return <form action={formAction} className="flex flex-wrap items-center gap-3"><SubmitButton>Unfreeze now</SubmitButton><FormMessage message={state.message} /></form>;
}

function CancelForm({ memberId, membershipId }: { memberId: string; membershipId: string }) {
  const action = cancelMembershipAction.bind(null, memberId, membershipId);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  return <form action={formAction} className="space-y-2"><input aria-label="Cancellation reason" className="h-9 w-full rounded-md border bg-white px-2 text-xs" maxLength={500} name="reason" placeholder="Cancellation reason" required /><div className="flex items-center gap-3"><SubmitButton danger>Cancel membership</SubmitButton><FormMessage message={state.message} /></div></form>;
}

function OverrideExpiryForm({ memberId, membershipId, endDate }: { memberId: string; membershipId: string; endDate: string }) {
  const action = overrideMembershipExpiryAction.bind(null, memberId, membershipId);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  return <form action={formAction} className="space-y-2"><div className="grid gap-2 sm:grid-cols-2"><input aria-label="New expiry date" className="h-9 rounded-md border bg-white px-2 text-xs" defaultValue={endDate} name="endDate" required type="date" /><input aria-label="Expiry override reason" className="h-9 rounded-md border bg-white px-2 text-xs" maxLength={500} name="reason" placeholder="Reason for override" required /></div><div className="flex items-center gap-3"><SubmitButton>Override expiry</SubmitButton><FormMessage message={state.message} /></div></form>;
}

export function MembershipLifecycleForms({ memberId, membershipId, status, endDate, canSell, canOverride, today }: { memberId: string; membershipId: string; status: MembershipStatus; endDate: string; canSell: boolean; canOverride: boolean; today: string }) {
  if (!canSell && !canOverride) return null;
  return <details className="mt-4 rounded-lg border"><summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]">Membership actions</summary><div className="space-y-3 border-t p-3">{canSell && status === "ACTIVE" ? <FreezeForm memberId={memberId} membershipId={membershipId} today={today} /> : null}{canSell && status === "FROZEN" ? <UnfreezeForm memberId={memberId} membershipId={membershipId} /> : null}{canOverride && status !== "CANCELLED" ? <OverrideExpiryForm endDate={endDate} memberId={memberId} membershipId={membershipId} /> : null}{canSell && status !== "CANCELLED" ? <CancelForm memberId={memberId} membershipId={membershipId} /> : null}</div></details>;
}
