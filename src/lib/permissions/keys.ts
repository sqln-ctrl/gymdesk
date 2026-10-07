export const PERMISSION_KEYS = [
  "audit.read",
  "branch.manage",
  "gym.manage",
  "member.archive",
  "member.create",
  "member.read",
  "member.update",
  "membership.override",
  "membership.plan.manage",
  "membership.sell",
  "payment.record",
  "payment.refund",
  "progress.manage",
  "progress.read",
  "invoice.read",
  "invoice.void",
  "report.finance",
  "report.read",
  "settings.manage",
  "staff.manage",
  "attendance.checkin",
  "attendance.override",
  "class.book",
  "class.manage",
  "class.read",
  "equipment.manage",
  "equipment.read",
  "workout.manage",
  "workout.read",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_KEYS = ["OWNER", "BRANCH_ADMIN", "RECEPTIONIST", "TRAINER"] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const OWNER_ROLE_KEY: RoleKey = "OWNER";
