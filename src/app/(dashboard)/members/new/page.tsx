import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberForm } from "@/components/members/member-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberFormOptions } from "@/server/services/members";

export default async function NewMemberPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.create")) {
    redirect("/members");
  }

  const options = await getMemberFormOptions(user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Member management</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Add member</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">A unique member code is assigned automatically.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/members">Cancel</Link></Button>
      </section>
      <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7">
        <MemberForm branches={options.branches} trainers={options.trainers} />
      </section>
    </div>
  );
}
