import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listWorkoutTemplates } from "@/server/services/workouts";

export default async function WorkoutTemplatesPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "workout.read") && !hasPermission(user, "workout.manage")) redirect("/dashboard");
  const templates = await listWorkoutTemplates(user);
  const canManage = hasPermission(user, "workout.manage");
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">Training</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Workout templates</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Reusable multi-day programs that trainers can copy to members.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href="/workouts">Exercise library</Link></Button>{canManage ? <Button asChild><Link href="/workouts/templates/new">Create template</Link></Button> : null}</div></section>{templates.length === 0 ? <EmptyState title="No workout templates" description="Create a reusable program after adding exercises to the library." /> : <section className="grid gap-4 md:grid-cols-2">{templates.map((template) => <article className="rounded-xl border bg-[var(--surface)] p-5" key={template.id}><h2 className="font-semibold"><Link className="hover:underline" href={`/workouts/templates/${template.id}`}>{template.name}</Link></h2><p className="mt-2 min-h-10 text-sm text-[var(--muted-foreground)]">{template.description ?? "No description"}</p><div className="mt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]"><span>{template.dayCount} training days</span><span>By {template.createdByName}</span></div></article>)}</section>}</div>;
}
