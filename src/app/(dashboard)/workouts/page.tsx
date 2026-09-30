import Link from "next/link";
import { redirect } from "next/navigation";

import { ExerciseLibrary } from "@/components/workouts/exercise-library";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getWorkoutGymOptions, listExercises } from "@/server/services/workouts";

export default async function WorkoutsPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "workout.read") && !hasPermission(user, "workout.manage")) redirect("/dashboard");
  const canManage = hasPermission(user, "workout.manage");
  const [exercises, gyms] = await Promise.all([listExercises(user), getWorkoutGymOptions(user)]);
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Training</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Workout library</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Build the exercise catalog used by trainer templates and member plans.</p></div><Button asChild variant="secondary"><Link href="/workouts/templates">Workout templates</Link></Button></section><ExerciseLibrary canManage={canManage} exercises={exercises} gyms={gyms} /></div>;
}
