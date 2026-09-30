export const MEMBERSHIP_DURATION_UNITS = ["DAYS", "MONTHS"] as const;

export type MembershipDurationUnit = (typeof MEMBERSHIP_DURATION_UNITS)[number];

export const MEMBERSHIP_STATUSES = ["PENDING", "ACTIVE", "FROZEN", "EXPIRED", "CANCELLED"] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  FROZEN: "Frozen",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};
