import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MemberForm } from "@/components/members/member-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberDetail, getMemberFormOptions } from "@/server/services/members";

type PageProps = { params: Promise<{ memberId: string }> };

export default async function EditMemberPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.update")) {
    redirect("/members");
  }

  const { memberId } = await params;
  const [member, options] = await Promise.all([
    getMemberDetail(user, memberId),
    getMemberFormOptions(user),
  ]);
  if (!member) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">{member.memberCode}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Edit {member.firstName} {member.lastName}</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Changes are recorded in the audit log.</p>
        </div>
        <Button asChild variant="secondary"><Link href={`/members/${member.id}`}>Cancel</Link></Button>
      </section>
      <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7">
        <MemberForm
          branches={options.branches}
          member={{
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            email: member.email,
            dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            emergencyContactName: member.emergencyContactName,
            emergencyContactPhone: member.emergencyContactPhone,
            address: member.address,
            assignedTrainerId: member.assignedTrainerId,
            notes: member.notes,
            branchId: member.branch.id,
          }}
          trainers={options.trainers}
        />
      </section>
    </div>
  );
}
