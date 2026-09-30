import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listStaff } from "@/server/services/staff";

function roleLabel(value: string | null): string {
  if (value === "BRANCH_ADMIN") return "Branch administrator";
  if (value === "RECEPTIONIST") return "Receptionist";
  if (value === "TRAINER") return "Trainer";
  if (value === "OWNER") return "Owner";
  return "No role";
}

export default async function StaffPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "staff.manage")) redirect("/dashboard");
  const staff = await listStaff(user);

  return <div className="space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">People operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Staff and trainers</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Manage staff roles, branch access, trainer profiles, and account status.</p></div><Button asChild><Link href="/staff/new">Add staff member</Link></Button></section>{staff.length === 0 ? <EmptyState title="No staff accounts" description="Create a staff account to assign reception, administration, or training access." /> : <section className="overflow-hidden rounded-xl border bg-[var(--surface)]"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-5 py-3">Staff member</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Branches</th><th className="px-5 py-3">Specialization</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y">{staff.map((person) => <tr key={person.id}><td className="px-5 py-4"><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/staff/${person.id}`}>{person.name}</Link><p className="text-xs text-[var(--muted-foreground)]">{person.email}</p></td><td className="px-5 py-4">{roleLabel(person.roleKey)}</td><td className="px-5 py-4">{person.branches.join(", ")}</td><td className="px-5 py-4">{person.specialization ?? "—"}</td><td className="px-5 py-4"><span className="font-medium">{person.status}</span></td></tr>)}</tbody></table></div></section>}</div>;
}
