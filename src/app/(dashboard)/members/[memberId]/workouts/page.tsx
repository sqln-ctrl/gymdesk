import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MemberWorkoutPlanForm } from "@/components/workouts/member-workout-plan-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberDetail } from "@/server/services/members";
import { getMemberWorkoutPlanOptions, listMemberWorkoutPlans } from "@/server/services/workouts";

type PageProps = { params: Promise<{ memberId: string }> };

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function exerciseDetail(exercise: { sets: number | null; reps: string | null; weightKg: number | null; restSeconds: number | null; durationSeconds: number | null }): string {
  return [exercise.sets ? `${exercise.sets} sets` : null, exercise.reps ? `${exercise.reps} reps` : null, exercise.weightKg !== null ? `${exercise.weightKg} kg` : null, exercise.restSeconds !== null ? `${exercise.restSeconds}s rest` : null, exercise.durationSeconds !== null ? `${exercise.durationSeconds}s` : null].filter(Boolean).join(" · ");
}

export default async function MemberWorkoutsPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.read") && !hasPermission(user, "workout.read") && !hasPermission(user, "workout.manage")) redirect("/dashboard");
  const { memberId } = await params;
  const [member, plans, options] = await Promise.all([getMemberDetail(user, memberId), listMemberWorkoutPlans(user, memberId), getMemberWorkoutPlanOptions(user, memberId)]);
  if (!member) notFound();
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">{member.memberCode}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{member.firstName} {member.lastName} workouts</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Read-only training plans with member-specific copies preserved from templates.</p></div><Button asChild variant="secondary"><Link href={`/members/${member.id}`}>Profile</Link></Button></section>{options.canManage ? <section className="rounded-xl border bg-[var(--surface)] p-5"><h2 className="font-semibold">Assign workout plan</h2><MemberWorkoutPlanForm memberId={member.id} templates={options.templates} today={dateValue(new Date())} /></section> : null}<section className="space-y-4">{plans.length === 0 ? <p className="rounded-xl border bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted-foreground)]">No workout plans are assigned yet.</p> : plans.map((plan) => <article className="rounded-xl border bg-[var(--surface)] p-5" key={plan.id}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-semibold">{plan.name}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Trainer: {plan.trainerName}{plan.templateName ? ` · From ${plan.templateName}` : ""}</p>{plan.goal ? <p className="mt-2 text-sm">Goal: {plan.goal}</p> : null}</div><span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">{plan.status}</span></div><div className="mt-5 grid gap-3 md:grid-cols-2">{plan.days.map((day) => <section className="rounded-lg border p-4" key={day.id}><h3 className="font-semibold">{day.title}</h3>{day.notes ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{day.notes}</p> : null}<ul className="mt-3 space-y-2">{day.exercises.map((exercise) => <li className="text-sm" key={exercise.id}><p className="font-medium">{exercise.exerciseName}</p><p className="text-xs text-[var(--muted-foreground)]">{exerciseDetail(exercise) || "Custom instruction"}{exercise.notes ? ` · ${exercise.notes}` : ""}</p></li>)}</ul></section>)}</div></article>)}</section></div>;
}
