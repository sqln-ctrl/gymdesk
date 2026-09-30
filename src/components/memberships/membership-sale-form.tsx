"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMembershipFormState } from "@/lib/memberships/form-state";
import { sellMembershipAction } from "@/server/actions/memberships";

type PlanOption = { id: string; name: string; durationLabel: string; priceMinor: number; registrationFeeMinor: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50" disabled={pending} type="submit">{pending ? "Creating…" : "Create membership"}</button>;
}

export function MembershipSaleForm({ memberId, branch, plans, today }: { memberId: string; branch: { id: string; name: string }; plans: PlanOption[]; today: string }) {
  const action = sellMembershipAction.bind(null, memberId);
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  const inputClassName = "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm";
  return <form action={formAction} className="space-y-6" noValidate>
    {state.message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{state.message}</p> : null}
    {plans.length === 0 ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">There are no active plans for this gym. Ask an administrator to create one first.</p> : <><input name="branchId" type="hidden" value={branch.id} /><div><p className="text-sm font-medium">Branch</p><p className="mt-2 rounded-lg border bg-[var(--surface-muted)] px-3 py-3 text-sm">{branch.name}</p></div><div><label className="text-sm font-medium" htmlFor="planId">Membership plan</label><select aria-describedby={state.fieldErrors?.planId ? "planId-error" : undefined} className={inputClassName} defaultValue="" id="planId" name="planId" required><option disabled value="">Choose a plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.durationLabel} · {((plan.priceMinor + plan.registrationFeeMinor) / 100).toFixed(2)}</option>)}</select>{state.fieldErrors?.planId ? <p className="mt-1 text-sm text-[var(--danger)]" id="planId-error">{state.fieldErrors.planId[0]}</p> : null}</div><div className="grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-medium" htmlFor="startDate">Start date</label><input className={inputClassName} defaultValue={today} id="startDate" name="startDate" required type="date" /></div><div><label className="text-sm font-medium" htmlFor="discountMinor">Discount (minor units)</label><input className={inputClassName} defaultValue="0" id="discountMinor" min="0" name="discountMinor" required type="number" /></div></div><div className="flex justify-end border-t pt-6"><SubmitButton /></div></>}
  </form>;
}
