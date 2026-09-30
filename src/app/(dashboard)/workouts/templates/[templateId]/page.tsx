import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { WorkoutTemplateEditor } from "@/components/workouts/workout-template-editor";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getWorkoutGymOptions, getWorkoutTemplate, listExercises } from "@/server/services/workouts";

type PageProps = { params: Promise<{ templateId: string }> };

export default async function WorkoutTemplatePage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "workout.read") && !hasPermission(user, "workout.manage")) redirect("/dashboard");
  const { templateId } = await params;
  const [template, gyms, exercises] = await Promise.all([getWorkoutTemplate(user, templateId), getWorkoutGymOptions(user), listExercises(user)]);
  if (!template) notFound();
  const trainerOnly = user.roleKeys.includes("TRAINER") && !user.roleKeys.includes("BRANCH_ADMIN") && !user.roleKeys.includes("OWNER");
  const canEdit = hasPermission(user, "workout.manage") && (!trainerOnly || template.createdById === user.id);
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[var(--brand)]">Workout template</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{template.name}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{template.description ?? "No description"}</p></div><Button asChild variant="secondary"><Link href="/workouts/templates">Back to templates</Link></Button></section>{canEdit ? <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><WorkoutTemplateEditor exercises={exercises} gyms={gyms} template={{ id: template.id, gymId: template.gymId, name: template.name, description: template.description, days: template.days.map((day) => ({ title: day.title, notes: day.notes ?? undefined, exercises: day.exercises.map(({ exerciseId, sets, reps, weightKg, restSeconds, durationSeconds, notes }) => ({ exerciseId, sets: sets ?? undefined, reps: reps ?? undefined, weightKg: weightKg ?? undefined, restSeconds: restSeconds ?? undefined, durationSeconds: durationSeconds ?? undefined, notes: notes ?? undefined })) })) }} /></section> : <section className="rounded-xl border bg-[var(--surface)] p-5"><p className="text-sm text-[var(--muted-foreground)]">This template is read-only for your current role.</p>{template.days.map((day) => <article className="mt-4 rounded-lg border p-4" key={day.id}><h2 className="font-semibold">{day.title}</h2><ul className="mt-2 space-y-1 text-sm">{day.exercises.map((exercise) => <li key={exercise.id}>{exercise.exerciseName} · {exercise.sets ?? "—"} sets × {exercise.reps ?? "—"}</li>)}</ul></article>)}</section>}</div>;
}
