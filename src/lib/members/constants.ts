export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};
