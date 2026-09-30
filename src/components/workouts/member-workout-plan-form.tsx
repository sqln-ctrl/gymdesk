"use client";

import { useActionState } from "react";

import { initialWorkoutFormState } from "@/lib/workouts/form-state";
import { createMemberWorkoutPlanAction } from "@/server/actions/workouts";

export function MemberWorkoutPlanForm({ memberId, templates, today }: { memberId: string; templates: Array<{ id: string; name: string }>; today: string }) {
  const [state, formAction, isPending] = useActionState(createMemberWorkoutPlanAction, initialWorkoutFormState);
  const inputClassName = "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm";
  if (templates.length === 0) return <p className="mt-3 text-sm text-[var(--muted-foreground)]">Create a workout template before assigning a program to this member.</p>;
  return <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="memberId" type="hidden" value={memberId} /><div><label className="text-sm font-medium" htmlFor="templateId">Template</label><select className={inputClassName} defaultValue="" id="templateId" name="templateId" required><option disabled value="">Choose a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div><div><label className="text-sm font-medium" htmlFor="name">Plan name</label><input className={inputClassName} id="name" maxLength={120} name="name" placeholder="e.g. Strength foundation" required /></div><div><label className="text-sm font-medium" htmlFor="startDate">Start date</label><input className={inputClassName} defaultValue={today} id="startDate" name="startDate" required type="date" /></div><div><label className="text-sm font-medium" htmlFor="endDate">End date</label><input className={inputClassName} id="endDate" name="endDate" type="date" /></div><div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="goal">Goal</label><textarea className="mt-1 min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm" id="goal" maxLength={1000} name="goal" placeholder="Member-specific training goal" /></div><button className="h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-fit" disabled={isPending} type="submit">{isPending ? "Copying..." : "Copy template to member"}</button>{state.message ? <p className={`text-sm sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>{state.message}</p> : null}</form>;
}
