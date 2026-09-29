import { MEMBER_STATUS_LABELS, type MemberStatus } from "@/lib/members/constants";

const statusClasses: Record<MemberStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
  SUSPENDED: "bg-amber-50 text-amber-800 ring-amber-200",
  ARCHIVED: "bg-red-50 text-red-800 ring-red-200",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[status]}`}>
      {MEMBER_STATUS_LABELS[status]}
    </span>
  );
}
