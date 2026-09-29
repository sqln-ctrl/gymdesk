import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberImportForm } from "@/components/members/member-import-form";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberFormOptions } from "@/server/services/members";

export default async function ImportMembersPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "member.create")) {
    redirect("/members");
  }

  const options = await getMemberFormOptions(user);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Member management</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Import members</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Review the CSV preview before adding up to 200 members to one branch.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/members">Cancel</Link></Button>
      </section>
      <section className="rounded-xl border bg-[var(--surface)] p-5 sm:p-7"><MemberImportForm branches={options.branches} /></section>
    </div>
  );
}
