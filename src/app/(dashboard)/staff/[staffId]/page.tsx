import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StaffForm } from "@/components/staff/staff-form";
import { StaffStatusForm } from "@/components/staff/staff-status-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getStaffDetail, getStaffFormOptions } from "@/server/services/staff";

type PageProps = { params: Promise<{ staffId: string }> };

function dateInputValue(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function StaffDetailPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "staff.manage")) redirect("/dashboard");
  const { staffId } = await params;
  const [staff, options] = await Promise.all([getStaffDetail(user, staffId), getStaffFormOptions(user)]);
  if (!staff) notFound();
  const editable = staff.roleKey !== "OWNER" && staff.id !== user.id;
  return <div className="mx-auto max-w-5xl space-y-6"><section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-[var(--brand)]">{staff.roleKey ?? "STAFF"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{staff.name}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{staff.email} · {staff.branches.join(", ")}</p></div><Button asChild variant="secondary"><Link href="/staff">Back to staff</Link></Button></section>{editable ? <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><StaffForm branches={options.branches} roles={options.roles} staff={{ id: staff.id, name: staff.name, email: staff.email, phone: staff.phone, roleKey: staff.roleKey, branchIds: staff.branchIds, hireDate: dateInputValue(staff.hireDate), specialization: staff.specialization, certifications: staff.certifications }} /></section> : <p className="rounded-xl border bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">This protected account cannot be edited here.</p>}<section className="rounded-xl border bg-[var(--surface)] p-5"><h2 className="font-semibold">Assigned members</h2>{staff.assignedMembers.length === 0 ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">No members are assigned to this staff member.</p> : <ul className="mt-3 divide-y">{staff.assignedMembers.map((member) => <li className="flex items-center justify-between gap-3 py-3 text-sm" key={member.id}><Link className="font-medium text-[var(--brand)] hover:underline" href={`/members/${member.id}`}>{member.name}<span className="ml-2 text-xs text-[var(--muted-foreground)]">{member.memberCode}</span></Link><span>{member.status}</span></li>)}</ul>}</section>{editable ? <section className="rounded-xl border border-red-200 bg-red-50 p-5"><h2 className="font-semibold text-red-900">Account status</h2><p className="mt-1 text-sm text-red-800">Deactivating ends active sessions but preserves records and audit history.</p><div className="mt-4"><StaffStatusForm staffId={staff.id} status={staff.status} /></div></section> : null}</div>;
}
