import { Button } from "@/components/ui/button";
import type { ReportBranchOption } from "@/server/services/reports";

type ReportFiltersProps = {
  branches: ReportBranchOption[];
  branchId?: string;
  start: string;
  end: string;
};

export function ReportFilters({ branches, branchId, start, end }: ReportFiltersProps) {
  return (
    <form className="grid gap-3 rounded-xl border bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] lg:items-end" method="get">
      <label className="grid gap-1 text-sm font-medium">
        Branch
        <select className="h-10 rounded-lg border bg-[var(--surface)] px-3 font-normal" defaultValue={branchId ?? ""} name="branchId">
          <option value="">All accessible branches</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        From
        <input className="h-10 rounded-lg border bg-[var(--surface)] px-3 font-normal" defaultValue={start} name="start" type="date" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        To
        <input className="h-10 rounded-lg border bg-[var(--surface)] px-3 font-normal" defaultValue={end} name="end" type="date" />
      </label>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}
