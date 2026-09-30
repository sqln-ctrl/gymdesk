import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkoutTemplateEditor } from "@/components/workouts/workout-template-editor";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getWorkoutGymOptions, listExercises } from "@/server/services/workouts";

export default async function NewWorkoutTemplatePage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "workout.manage")) redirect("/workouts/templates");
  const [gyms, exercises] = await Promise.all([getWorkoutGymOptions(user), listExercises(user)]);
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[var(--brand)]">Training</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Create workout template</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Each day requires at least one exercise.</p></div><Button asChild variant="secondary"><Link href="/workouts/templates">Cancel</Link></Button></section><section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><WorkoutTemplateEditor exercises={exercises} gyms={gyms} /></section></div>;
}
