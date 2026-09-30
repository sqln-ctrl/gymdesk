"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMembershipFormState } from "@/lib/memberships/form-state";
import { createMembershipPlanAction, updateMembershipPlanAction } from "@/server/actions/memberships";

type GymOption = { id: string; name: string };

export type EditableMembershipPlan = {
  id: string; gymId: string; name: string; description: string | null; durationValue: number; durationUnit: "DAYS" | "MONTHS";
  priceMinor: number; registrationFeeMinor: number; taxRateBasisPoints: number; freezeDaysAllowed: number; graceDays: number;
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <button className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving…" : editing ? "Save changes" : "Create plan"}</button>;
}

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const message = errors?.[field]?.[0];
  return message ? <p className="mt-1 text-sm text-[var(--danger)]" id={`${field}-error`}>{message}</p> : null;
}

export function MembershipPlanForm({ gyms, plan }: { gyms: GymOption[]; plan?: EditableMembershipPlan }) {
  const action = plan ? updateMembershipPlanAction.bind(null, plan.id) : createMembershipPlanAction;
  const [state, formAction] = useActionState(action, initialMembershipFormState);
  const inputClassName = "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm";
  return <form action={formAction} className="space-y-7" noValidate>
    {state.message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{state.message}</p> : null}
    <section><h2 className="text-base font-semibold">Plan details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="name">Plan name</label><input aria-describedby={state.fieldErrors?.name ? "name-error" : undefined} className={inputClassName} defaultValue={plan?.name} id="name" maxLength={100} name="name" required /><FieldError errors={state.fieldErrors} field="name" /></div>
      <div><label className="text-sm font-medium" htmlFor="gymId">Gym</label><select className={inputClassName} defaultValue={plan?.gymId ?? (gyms.length === 1 ? gyms[0].id : "")} id="gymId" name="gymId" required><option disabled value="">Choose a gym</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select><FieldError errors={state.fieldErrors} field="gymId" /></div>
      <div><label className="text-sm font-medium" htmlFor="durationValue">Duration</label><div className="mt-2 grid grid-cols-2 gap-2"><input className="h-11 rounded-lg border bg-white px-3 text-sm" defaultValue={plan?.durationValue ?? 30} id="durationValue" min="1" name="durationValue" required type="number" /><select className="h-11 rounded-lg border bg-white px-3 text-sm" defaultValue={plan?.durationUnit ?? "DAYS"} name="durationUnit"><option value="DAYS">Days</option><option value="MONTHS">Months</option></select></div><FieldError errors={state.fieldErrors} field="durationValue" /></div>
      <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="description">Description</label><textarea className="mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm" defaultValue={plan?.description ?? undefined} id="description" maxLength={1000} name="description" rows={3} /></div>
    </div></section>
    <section className="border-t pt-7"><h2 className="text-base font-semibold">Pricing and rules</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Amounts use minor units (for example, 12,500 = PKR 125.00).</p><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className="text-sm font-medium" htmlFor="priceMinor">Membership price</label><input className={inputClassName} defaultValue={plan?.priceMinor ?? 0} id="priceMinor" min="0" name="priceMinor" required type="number" /><FieldError errors={state.fieldErrors} field="priceMinor" /></div>
      <div><label className="text-sm font-medium" htmlFor="registrationFeeMinor">Registration fee</label><input className={inputClassName} defaultValue={plan?.registrationFeeMinor ?? 0} id="registrationFeeMinor" min="0" name="registrationFeeMinor" required type="number" /><FieldError errors={state.fieldErrors} field="registrationFeeMinor" /></div>
      <div><label className="text-sm font-medium" htmlFor="taxRateBasisPoints">Tax (basis points)</label><input className={inputClassName} defaultValue={plan?.taxRateBasisPoints ?? 0} id="taxRateBasisPoints" max="10000" min="0" name="taxRateBasisPoints" required type="number" /><FieldError errors={state.fieldErrors} field="taxRateBasisPoints" /></div>
      <div><label className="text-sm font-medium" htmlFor="freezeDaysAllowed">Freeze allowance (days)</label><input className={inputClassName} defaultValue={plan?.freezeDaysAllowed ?? 0} id="freezeDaysAllowed" min="0" name="freezeDaysAllowed" required type="number" /><FieldError errors={state.fieldErrors} field="freezeDaysAllowed" /></div>
      <div><label className="text-sm font-medium" htmlFor="graceDays">Grace period (days)</label><input className={inputClassName} defaultValue={plan?.graceDays ?? 0} id="graceDays" min="0" name="graceDays" required type="number" /><FieldError errors={state.fieldErrors} field="graceDays" /></div>
    </div></section>
    <div className="flex justify-end border-t pt-6"><SubmitButton editing={Boolean(plan)} /></div>
  </form>;
}
