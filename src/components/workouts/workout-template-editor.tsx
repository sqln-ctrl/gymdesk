"use client";

import { useActionState, useMemo, useState } from "react";

import { initialWorkoutFormState } from "@/lib/workouts/form-state";
import { createWorkoutTemplateAction, updateWorkoutTemplateAction } from "@/server/actions/workouts";

type Exercise = { id: string; gymId: string; name: string; isActive: boolean };
type ExerciseRow = { exerciseId: string; sets?: number; reps?: string; weightKg?: number; restSeconds?: number; durationSeconds?: number; notes?: string };
type WorkoutDay = { title: string; notes?: string; exercises: ExerciseRow[] };
type ExistingTemplate = { id: string; gymId: string; name: string; description: string | null; days: WorkoutDay[] };

function emptyExercise(exercises: Exercise[]): ExerciseRow {
  return { exerciseId: exercises[0]?.id ?? "", sets: 3, reps: "10", restSeconds: 60 };
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function NumberField({ label, value, onChange, step }: { label: string; value?: number; onChange: (value: number | undefined) => void; step?: string }) {
  return <input aria-label={label} className="h-9 rounded border px-2 text-xs" min="0" onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)} placeholder={label} step={step ?? "1"} type="number" value={value ?? ""} />;
}

export function WorkoutTemplateEditor({ gyms, exercises, template }: { gyms: Array<{ id: string; name: string }>; exercises: Exercise[]; template?: ExistingTemplate }) {
  const action = template ? updateWorkoutTemplateAction.bind(null, template.id) : createWorkoutTemplateAction;
  const [state, formAction, isPending] = useActionState(action, initialWorkoutFormState);
  const [gymId, setGymId] = useState(template?.gymId ?? (gyms.length === 1 ? gyms[0].id : ""));
  const availableExercises = useMemo(() => exercises.filter((exercise) => exercise.gymId === gymId && exercise.isActive), [exercises, gymId]);
  const [days, setDays] = useState<WorkoutDay[]>(() => template?.days.length ? template.days : [{ title: "Day 1", exercises: [emptyExercise(exercises)] }]);
  const inputClassName = "h-10 w-full rounded-lg border bg-white px-3 text-sm";

  function updateDay(dayIndex: number, update: Partial<WorkoutDay>) {
    setDays((current) => current.map((day, index) => index === dayIndex ? { ...day, ...update } : day));
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, update: Partial<ExerciseRow>) {
    updateDay(dayIndex, { exercises: days[dayIndex].exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, ...update } : exercise) });
  }

  return (
    <form action={formAction} className="space-y-7" noValidate>
      <input name="daysJson" type="hidden" value={JSON.stringify(days)} />
      {state.message ? <p className={`rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p> : null}
      <section className="grid gap-4 sm:grid-cols-2">
        <div><label className="text-sm font-medium" htmlFor="gymId">Gym</label><select className={`mt-2 ${inputClassName}`} id="gymId" name="gymId" onChange={(event) => setGymId(event.target.value)} required value={gymId} disabled={Boolean(template)}><option disabled value="">Choose gym</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select></div>
        <div><label className="text-sm font-medium" htmlFor="name">Template name</label><input className={`mt-2 ${inputClassName}`} defaultValue={template?.name} id="name" maxLength={120} name="name" required /></div>
        <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="description">Description</label><textarea className="mt-2 min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm" defaultValue={template?.description ?? undefined} id="description" maxLength={1000} name="description" /></div>
      </section>
      <section className="border-t pt-7">
        <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Training days</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Add, edit, or reorder days and exercises before saving.</p></div><button className="rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => setDays((current) => [...current, { title: `Day ${current.length + 1}`, exercises: [emptyExercise(availableExercises)] }])} type="button">Add day</button></div>
        {availableExercises.length === 0 ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add active exercises for this gym before creating a template.</p> : null}
        <div className="mt-5 space-y-5">{days.map((day, dayIndex) => <article className="rounded-xl border p-4" key={`${dayIndex}-${day.title}`}><div className="flex flex-wrap items-start gap-2"><input className="h-10 min-w-48 flex-1 rounded-lg border px-3 text-sm font-semibold" onChange={(event) => updateDay(dayIndex, { title: event.target.value })} placeholder={`Day ${dayIndex + 1} title`} required value={day.title} /><button className="rounded border px-2 py-1 text-xs" disabled={dayIndex === 0} onClick={() => setDays((current) => move(current, dayIndex, dayIndex - 1))} type="button">Move up</button><button className="rounded border px-2 py-1 text-xs" disabled={dayIndex === days.length - 1} onClick={() => setDays((current) => move(current, dayIndex, dayIndex + 1))} type="button">Move down</button><button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700" disabled={days.length === 1} onClick={() => setDays((current) => current.filter((_, index) => index !== dayIndex))} type="button">Remove day</button></div><textarea className="mt-3 min-h-16 w-full rounded-lg border px-3 py-2 text-sm" onChange={(event) => updateDay(dayIndex, { notes: event.target.value || undefined })} placeholder="Day notes" value={day.notes ?? ""} /><div className="mt-4 space-y-3">{day.exercises.map((exercise, exerciseIndex) => <div className="rounded-lg bg-[var(--surface-muted)] p-3" key={`${exerciseIndex}-${exercise.exerciseId}`}><div className="grid gap-2 sm:grid-cols-4"><select className="h-9 rounded border bg-white px-2 text-xs sm:col-span-2" onChange={(event) => updateExercise(dayIndex, exerciseIndex, { exerciseId: event.target.value })} required value={exercise.exerciseId}><option disabled value="">Choose exercise</option>{availableExercises.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><NumberField label="Sets" onChange={(value) => updateExercise(dayIndex, exerciseIndex, { sets: value })} value={exercise.sets} /><input className="h-9 rounded border px-2 text-xs" onChange={(event) => updateExercise(dayIndex, exerciseIndex, { reps: event.target.value || undefined })} placeholder="Reps" value={exercise.reps ?? ""} /></div><div className="mt-2 grid gap-2 sm:grid-cols-4"><NumberField label="Weight kg" onChange={(value) => updateExercise(dayIndex, exerciseIndex, { weightKg: value })} step="0.25" value={exercise.weightKg} /><NumberField label="Rest sec" onChange={(value) => updateExercise(dayIndex, exerciseIndex, { restSeconds: value })} value={exercise.restSeconds} /><NumberField label="Duration sec" onChange={(value) => updateExercise(dayIndex, exerciseIndex, { durationSeconds: value })} value={exercise.durationSeconds} /><button className="rounded border px-2 text-xs" disabled={day.exercises.length === 1} onClick={() => updateDay(dayIndex, { exercises: day.exercises.filter((_, index) => index !== exerciseIndex) })} type="button">Remove exercise</button></div><input className="mt-2 h-9 w-full rounded border px-2 text-xs" maxLength={500} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { notes: event.target.value || undefined })} placeholder="Exercise notes" value={exercise.notes ?? ""} /><div className="mt-2 flex gap-2"><button className="rounded border px-2 py-1 text-xs" disabled={exerciseIndex === 0} onClick={() => updateDay(dayIndex, { exercises: move(day.exercises, exerciseIndex, exerciseIndex - 1) })} type="button">Move up</button><button className="rounded border px-2 py-1 text-xs" disabled={exerciseIndex === day.exercises.length - 1} onClick={() => updateDay(dayIndex, { exercises: move(day.exercises, exerciseIndex, exerciseIndex + 1) })} type="button">Move down</button></div></div>)}</div><button className="mt-3 rounded-lg border px-3 py-2 text-xs font-semibold" onClick={() => updateDay(dayIndex, { exercises: [...day.exercises, emptyExercise(availableExercises)] })} type="button">Add exercise</button></article>)}</div>
      </section>
      <div className="flex justify-end border-t pt-6"><button className="h-11 rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending || availableExercises.length === 0} type="submit">{isPending ? "Saving..." : template ? "Save template" : "Create template"}</button></div>
    </form>
  );
}
