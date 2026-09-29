import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { MemberStatusBadge } from "@/components/members/status-badge";
import { Button } from "@/components/ui/button";
import { MEMBER_STATUSES, type MemberStatus } from "@/lib/members/constants";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberFormOptions, listMembers } from "@/server/services/members";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isMemberStatus(value: string | undefined): value is MemberStatus {
  return Boolean(value && MEMBER_STATUSES.includes(value as MemberStatus));
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function MembersPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();

  if (!hasPermission(user, "member.read")) {
    return (
      <EmptyState
        title="Member access is restricted"
        description="Your account does not have permission to view member records. Ask a workspace owner to update your access."
      />
    );
  }

  const params = await searchParams;
  const rawPage = Number(valueOf(params.page));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = valueOf(params.search)?.slice(0, 100);
  const statusParam = valueOf(params.status);
  const status = isMemberStatus(statusParam) ? statusParam : undefined;
  const branchId = valueOf(params.branchId);
  const [result, formOptions] = await Promise.all([
    listMembers(user, { page, search, status, branchId }),
    getMemberFormOptions(user),
  ]);
  const canCreate = hasPermission(user, "member.create");
  const canExport = hasPermission(user, "member.read");
  const importedCount = Number(valueOf(params.imported));
  const importedMessage = Number.isInteger(importedCount) && importedCount > 0 && importedCount <= 200
    ? `${importedCount} member${importedCount === 1 ? "" : "s"} imported successfully.`
    : undefined;

  function pageHref(nextPage: number): string {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (status) next.set("status", status);
    if (branchId) next.set("branchId", branchId);
    next.set("page", String(nextPage));
    return `/members?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Member management</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Members</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Search and manage member records within your branch access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport ? (
            <Button asChild variant="secondary">
              <Link href="/api/members/export">Export CSV</Link>
            </Button>
          ) : null}
          {canCreate ? (
            <>
              <Button asChild variant="secondary"><Link href="/members/import">Import CSV</Link></Button>
              <Button asChild><Link href="/members/new">Add member</Link></Button>
            </>
          ) : null}
        </div>
      </section>

      {importedMessage ? <p className="rounded-lg bg-[var(--brand-soft)] px-4 py-3 text-sm font-medium text-[var(--brand)]" role="status">{importedMessage}</p> : null}

      <form className="grid gap-3 rounded-xl border bg-[var(--surface)] p-4 md:grid-cols-[minmax(0,1fr)_180px_220px_auto]" method="get">
        <label className="sr-only" htmlFor="member-search">Search members</label>
        <input className="h-10 w-full rounded-lg border bg-white px-3 text-sm" defaultValue={search} id="member-search" maxLength={100} name="search" placeholder="Search name, member code, phone, or email" type="search" />
        <label className="sr-only" htmlFor="member-status">Status</label>
        <select className="h-10 rounded-lg border bg-white px-3 text-sm" defaultValue={status ?? ""} id="member-status" name="status">
          <option value="">All statuses</option>
          {MEMBER_STATUSES.map((item) => <option key={item} value={item}>{item[0]}{item.slice(1).toLowerCase()}</option>)}
        </select>
        <label className="sr-only" htmlFor="member-branch">Branch</label>
        <select className="h-10 rounded-lg border bg-white px-3 text-sm" defaultValue={branchId ?? ""} id="member-branch" name="branchId">
          <option value="">All accessible branches</option>
          {formOptions.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
        </select>
        <Button type="submit" variant="secondary">Apply filters</Button>
      </form>

      {result.total === 0 ? (
        <EmptyState
          title={search || status || branchId ? "No matching members" : "No members yet"}
          description={search || status || branchId ? "Try changing the search or filters." : "Create the first member record to begin managing memberships, billing, and attendance."}
        />
      ) : (
        <section className="overflow-hidden rounded-xl border bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Trainer</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((member) => (
                  <tr className="hover:bg-[var(--surface-muted)]" key={member.id}>
                    <td className="px-5 py-4">
                      <Link className="font-semibold text-[var(--brand)] hover:underline" href={`/members/${member.id}`}>{member.fullName}</Link>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{member.memberCode}</p>
                    </td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{member.phone ?? member.email ?? "—"}</td>
                    <td className="px-5 py-4">{member.branchName}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{member.trainerName ?? "Unassigned"}</td>
                    <td className="px-5 py-4"><MemberStatusBadge status={member.status} /></td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{formatDate(member.joinDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[var(--muted-foreground)]">{result.total} {result.total === 1 ? "member" : "members"} · Page {result.page} of {result.pageCount}</p>
            <div className="flex gap-2">
              {result.page > 1 ? <Button asChild size="sm" variant="secondary"><Link href={pageHref(result.page - 1)}>Previous</Link></Button> : null}
              {result.page < result.pageCount ? <Button asChild size="sm" variant="secondary"><Link href={pageHref(result.page + 1)}>Next</Link></Button> : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
