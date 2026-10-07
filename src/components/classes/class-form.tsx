"use client";

import { useActionState } from "react";

import { initialClassFormState } from "@/lib/classes/form-state";
import { createFitnessClassAction } from "@/server/actions/classes";

export function ClassForm({ branches, trainers, startsAt }: { branches: Array<{ id: string; label: string }>; trainers: Array<{ id: string; name: string }>; startsAt: string }) {
  const [state, action, pending] = useActionState(createFitnessClassAction, initialClassFormState);
  const input = "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm";
  return <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
    <div><label className="text-sm font-medium" htmlFor="class-branch">Branch</label><select className={input} defaultValue="" id="class-branch" name="branchId" required><option disabled value="">Choose branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></div>
    <div><label className="text-sm font-medium" htmlFor="class-trainer">Trainer</label><select className={input} defaultValue="" id="class-trainer" name="trainerId"><option value="">Unassigned</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></div>
    <div><label className="text-sm font-medium" htmlFor="class-name">Class name</label><input className={input} id="class-name" maxLength={120} name="name" required /></div>
    <div><label className="text-sm font-medium" htmlFor="class-room">Room / area</label><input className={input} id="class-room" maxLength={100} name="room" /></div>
    <div><label className="text-sm font-medium" htmlFor="class-capacity">Capacity</label><input className={input} defaultValue="12" id="class-capacity" max="500" min="1" name="defaultCapacity" required type="number" /></div>
    <div><label className="text-sm font-medium" htmlFor="class-duration">Duration (minutes)</label><input className={input} defaultValue="60" id="class-duration" max="600" min="15" name="defaultDurationMinutes" required type="number" /></div>
    <div><label className="text-sm font-medium" htmlFor="class-first">First session (UTC)</label><input className={input} defaultValue={startsAt} id="class-first" name="firstSessionAt" required type="datetime-local" /></div>
    <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium" htmlFor="class-occurrences">Sessions</label><input className={input} defaultValue="8" id="class-occurrences" max="52" min="1" name="occurrences" required type="number" /></div><div><label className="text-sm font-medium" htmlFor="class-repeat">Repeat days</label><input className={input} defaultValue="7" id="class-repeat" max="31" min="1" name="repeatEveryDays" required type="number" /></div></div>
    <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="class-description">Description</label><textarea className="mt-1 min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm" id="class-description" maxLength={1000} name="description" /></div>
    <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button className="h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Creating..." : "Create class schedule"}</button>{state.message ? <p className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>{state.message}</p> : null}</div>
  </form>;
}
