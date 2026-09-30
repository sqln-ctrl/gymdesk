import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffForm } from "@/components/staff/staff-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getStaffFormOptions } from "@/server/services/staff";

export default async function NewStaffPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "staff.manage")) redirect("/dashboard");
  const options = await getStaffFormOptions(user);
  if (options.branches.length === 0) redirect("/staff");
  return <div className="mx-auto max-w-3xl space-y-6"><section className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[var(--brand)]">People operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Add staff member</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Access is granted only through the selected role and branches.</p></div><Button asChild variant="secondary"><Link href="/staff">Cancel</Link></Button></section><section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><StaffForm branches={options.branches} roles={options.roles} /></section></div>;
}
