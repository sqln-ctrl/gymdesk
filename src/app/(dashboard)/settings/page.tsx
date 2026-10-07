import { redirect } from "next/navigation";

import { BranchSettingsForm, GymSettingsForm } from "@/components/settings/settings-forms";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getSettings } from "@/server/services/settings";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "settings.manage")) redirect("/dashboard");

  const settings = await getSettings(user);
  if (!settings) redirect("/dashboard");

  return <div className="mx-auto max-w-5xl space-y-6"><section><p className="text-sm font-medium text-[var(--brand)]">Configuration</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Keep your gym profile and branch contact details up to date.</p></section>
    <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><h2 className="text-lg font-semibold">Gym profile</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">These details are used across the application and on financial records.</p><GymSettingsForm gym={settings.gym} /></section>
    <section className="space-y-4"><div><h2 className="text-lg font-semibold">Branches</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Manage contact details for each branch. Branch codes cannot be changed here.</p></div>{settings.branches.length === 0 ? <p className="rounded-xl border bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">No branches are assigned to this gym.</p> : settings.branches.map((branch) => <article className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7" key={branch.id}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{branch.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${branch.isActive ? "bg-emerald-50 text-emerald-700" : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]"}`}>{branch.isActive ? "Active" : "Inactive"}</span></div><BranchSettingsForm branch={branch} /></article>)}</section>
  </div>;
}
