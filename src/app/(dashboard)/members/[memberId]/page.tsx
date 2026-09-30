import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { MemberStatusBadge } from "@/components/members/status-badge";
import { MemberStatusForm } from "@/components/members/member-status-form";
import { MemberAvatarForm } from "@/components/members/member-avatar-form";
import { MemberQrCard } from "@/components/attendance/member-qr-card";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberDetail } from "@/server/services/members";

type PageProps = { params: Promise<{ memberId: string }> };

function display(value: string | null): string {
  return value || "Not provided";
}

function formatDate(value: Date | null): string {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

export default async function MemberProfilePage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.read")) {
    redirect("/dashboard");
  }

  const { memberId } = await params;
  const member = await getMemberDetail(user, memberId);
  if (!member) notFound();
  const canEdit = hasPermission(user, "member.update");
  const canChangeStatus = hasPermission(user, "member.archive");
  const canSellMembership = hasPermission(user, "membership.sell");
  const canCheckIn = hasPermission(user, "attendance.checkin");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              {member.avatarUrl ? (
                <Image alt={`${member.firstName} ${member.lastName}`} className="size-14 rounded-full object-cover" height={56} src={member.avatarUrl} width={56} />
              ) : (
                <div aria-hidden className="grid size-14 place-items-center rounded-full bg-[var(--brand-soft)] text-lg font-semibold text-[var(--brand)]">{member.firstName[0]}{member.lastName[0]}</div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-[var(--brand)]">{member.memberCode}</p>
                <MemberStatusBadge status={member.status} />
              </div>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{member.firstName} {member.lastName}</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Primary branch: {member.branch.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href="/members">Back to members</Link></Button>
            {canEdit ? <Button asChild><Link href={`/members/${member.id}/edit`}>Edit member</Link></Button> : null}
            {canSellMembership ? <Button asChild><Link href={`/members/${member.id}/memberships/new`}>Sell membership</Link></Button> : null}
            {canCheckIn ? <Button asChild variant="secondary"><Link href={`/attendance?q=${encodeURIComponent(member.memberCode)}&branchId=${member.branch.id}`}>Check in</Link></Button> : null}
          </div>
        </div>
        {canChangeStatus ? <div className="mt-6 border-t pt-5"><MemberStatusForm currentStatus={member.status} memberId={member.id} /></div> : null}
      </section>

      <nav aria-label="Member profile sections" className="flex gap-5 overflow-x-auto border-b px-1 text-sm font-medium">
        <span className="border-b-2 border-[var(--brand)] px-1 pb-3 text-[var(--brand)]">Overview</span>
        <Link className="px-1 pb-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" href={`/members/${member.id}/memberships`}>Memberships</Link>
        <Link className="px-1 pb-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" href={`/members/${member.id}/attendance`}>Attendance</Link>
        <Link className="px-1 pb-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" href={`/members/${member.id}/workouts`}>Workouts</Link>
        <span className="px-1 pb-3 text-[var(--muted-foreground)]">Billing (coming next)</span>
      </nav>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-xl border bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Contact details</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-[var(--muted-foreground)]">Phone</dt><dd className="mt-1 font-medium">{display(member.phone)}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Email</dt><dd className="mt-1 font-medium">{display(member.email)}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Date of birth</dt><dd className="mt-1 font-medium">{formatDate(member.dateOfBirth)}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Address</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{display(member.address)}</dd></div>
          </dl>
        </article>
        <article className="rounded-xl border bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Gym record</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-[var(--muted-foreground)]">Joined</dt><dd className="mt-1 font-medium">{formatDate(member.joinDate)}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Assigned trainer</dt><dd className="mt-1 font-medium">{display(member.assignedTrainerName)}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Emergency contact</dt><dd className="mt-1 font-medium">{display(member.emergencyContactName)}{member.emergencyContactPhone ? ` · ${member.emergencyContactPhone}` : ""}</dd></div>
          </dl>
        </article>
        <div className="md:col-span-2">
          <MemberQrCard memberCode={member.memberCode} memberId={member.id} />
        </div>
        <article className="rounded-xl border bg-[var(--surface)] p-5 md:col-span-2">
          <h2 className="font-semibold">Staff notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">{display(member.notes)}</p>
        </article>
        {canEdit ? <article className="rounded-xl border bg-[var(--surface)] p-5 md:col-span-2"><h2 className="font-semibold">Member photo</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">JPEG, PNG, or WebP up to 900 KB. Local files are stored by the development adapter.</p><MemberAvatarForm memberId={member.id} /></article> : null}
      </section>
    </div>
  );
}
