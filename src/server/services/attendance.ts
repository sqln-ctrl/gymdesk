import "server-only";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { DEFAULT_DUPLICATE_CHECKIN_WINDOW_MINUTES, type CheckInFailureCode } from "@/lib/attendance/constants";
import { memberIdFromQrPayload } from "@/lib/attendance/qr";
import type { CheckInInput } from "@/lib/attendance/schemas";
import { prisma } from "@/lib/db/prisma";
import { deriveMembershipStatus } from "@/lib/memberships/dates";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { canAccessBranch, hasPermission } from "@/lib/permissions/policy";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export type CheckInCandidate = {
  id: string;
  memberCode: string;
  fullName: string;
  phone: string | null;
  status: string;
};

export type AttendanceEntry = {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  checkInAt: Date;
  method: string;
  wasOverridden: boolean;
};

export type AttendanceReport = {
  totalCheckIns: number;
  uniqueMembers: number;
  daily: Array<{ date: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
};

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function inaccessibleMessage(code: CheckInFailureCode): string {
  const messages: Record<CheckInFailureCode, string> = {
    MEMBER_INACTIVE: "This member is inactive, suspended, or archived.",
    NO_MEMBERSHIP: "This member has no current membership for this branch.",
    MEMBERSHIP_PENDING: "This membership has not started yet.",
    MEMBERSHIP_FROZEN: "This membership is currently frozen.",
    MEMBERSHIP_EXPIRED: "This membership has expired.",
    MEMBERSHIP_CANCELLED: "This membership has been cancelled.",
    DUPLICATE_CHECKIN: `This member already checked in within the last ${DEFAULT_DUPLICATE_CHECKIN_WINDOW_MINUTES} minutes.`,
  };
  return messages[code];
}

async function getAccessibleBranch(actor: CurrentUser, branchId: string) {
  if (!canAccessBranch(actor, branchId)) return null;
  return prisma.branch.findFirst({
    where: { id: branchId, gymId: { in: [...actor.gymIds] }, isActive: true },
    select: { id: true, gymId: true, name: true },
  });
}

function membershipFailureCode(status: ReturnType<typeof deriveMembershipStatus>): CheckInFailureCode | null {
  const map = {
    PENDING: "MEMBERSHIP_PENDING",
    FROZEN: "MEMBERSHIP_FROZEN",
    EXPIRED: "MEMBERSHIP_EXPIRED",
    CANCELLED: "MEMBERSHIP_CANCELLED",
    ACTIVE: null,
  } as const;
  return map[status];
}

export async function getAttendanceBranchOptions(actor: CurrentUser): Promise<Array<{ id: string; label: string }>> {
  if (!hasPermission(actor, "attendance.checkin")) return [];
  const branches = await prisma.branch.findMany({
    where: {
      gymId: { in: [...actor.gymIds] },
      isActive: true,
      ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  return branches.map((branch) => ({ id: branch.id, label: `${branch.name} (${branch.code})` }));
}

export async function getAttendanceReportBranchOptions(actor: CurrentUser): Promise<Array<{ id: string; label: string }>> {
  if (!hasPermission(actor, "report.read")) return [];
  const branches = await prisma.branch.findMany({
    where: {
      gymId: { in: [...actor.gymIds] },
      isActive: true,
      ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  return branches.map((branch) => ({ id: branch.id, label: `${branch.name} (${branch.code})` }));
}

export async function searchCheckInMembers(actor: CurrentUser, branchId: string, search: string): Promise<CheckInCandidate[]> {
  if (!hasPermission(actor, "attendance.checkin") || search.trim().length < 2) return [];
  const branch = await getAccessibleBranch(actor, branchId);
  if (!branch) return [];
  const query = search.trim().slice(0, 100);
  const memberId = memberIdFromQrPayload(query);
  const members = await prisma.member.findMany({
    where: {
      gymId: branch.gymId,
      primaryBranchId: branch.id,
      ...(memberId
        ? { id: memberId }
        : {
            OR: [
              { memberCode: { contains: query } },
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { phone: { contains: query } },
            ],
          }),
    },
    select: { id: true, memberCode: true, firstName: true, lastName: true, phone: true, status: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 10,
  });
  return members.map((member) => ({
    id: member.id,
    memberCode: member.memberCode,
    fullName: `${member.firstName} ${member.lastName}`,
    phone: member.phone,
    status: member.status,
  }));
}

export async function checkInMember(actor: CurrentUser, input: CheckInInput): Promise<ServiceResult<{ checkInAt: Date; overridden: boolean }>> {
  if (!hasPermission(actor, "attendance.checkin")) return { ok: false, code: "FORBIDDEN", message: "You do not have permission to check in members." };
  const branch = await getAccessibleBranch(actor, input.branchId);
  if (!branch) return { ok: false, code: "FORBIDDEN", message: "You cannot check in members at that branch." };
  const now = new Date();
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, gymId: branch.gymId, primaryBranchId: branch.id },
    select: { id: true, status: true, firstName: true, lastName: true, memberships: { where: { branchId: branch.id }, select: { id: true, startDate: true, endDate: true, cancelledAt: true, freezes: { select: { startDate: true, endDate: true, unfrozenAt: true } } }, orderBy: { endDate: "desc" } } },
  });
  if (!member) return { ok: false, code: "NOT_FOUND", message: "Member access was not found for this branch." };

  let failureCode: CheckInFailureCode | null = member.status === "ACTIVE" ? null : "MEMBER_INACTIVE";
  if (!failureCode) {
    const activeMembership = member.memberships.find((membership) => deriveMembershipStatus(membership, now) === "ACTIVE");
    if (!activeMembership) {
      const current = member.memberships[0];
      failureCode = current ? membershipFailureCode(deriveMembershipStatus(current, now)) : "NO_MEMBERSHIP";
    }
  }

  const duplicateSince = new Date(now.getTime() - DEFAULT_DUPLICATE_CHECKIN_WINDOW_MINUTES * 60_000);
  const duplicate = await prisma.attendance.findFirst({
    where: { memberId: member.id, branchId: branch.id, checkInAt: { gte: duplicateSince } },
    select: { id: true },
    orderBy: { checkInAt: "desc" },
  });
  if (duplicate) failureCode = "DUPLICATE_CHECKIN";

  const needsOverride = failureCode !== null;
  if (failureCode !== null && !hasPermission(actor, "attendance.override")) {
    return { ok: false, code: failureCode, message: inaccessibleMessage(failureCode) };
  }
  if (failureCode !== null && !input.overrideReason) {
    return { ok: false, code: failureCode, message: `${inaccessibleMessage(failureCode)} An authorized override requires a reason.` };
  }

  const attendance = await prisma.$transaction(async (transaction) => {
    const latestDuplicate = await transaction.attendance.findFirst({
      where: { memberId: member.id, branchId: branch.id, checkInAt: { gte: duplicateSince } },
      select: { id: true },
      orderBy: { checkInAt: "desc" },
    });
    if (latestDuplicate && !needsOverride) return null;

    const created = await transaction.attendance.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        checkInAt: now,
        method: needsOverride ? "OVERRIDE" : input.method,
        sourceUserId: actor.id,
        overrideReason: needsOverride ? input.overrideReason : null,
      },
    });
    if (needsOverride) {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "ATTENDANCE_OVERRIDE_CHECKIN",
        entityType: "Attendance",
        entityId: created.id,
        metadata: { memberId: member.id, branchId: branch.id, reason: input.overrideReason, validationFailure: failureCode },
      });
    }
    return created;
  });
  if (!attendance) return { ok: false, code: "DUPLICATE_CHECKIN", message: inaccessibleMessage("DUPLICATE_CHECKIN") };
  return { ok: true, data: { checkInAt: attendance.checkInAt, overridden: needsOverride } };
}

export async function listRecentCheckIns(actor: CurrentUser, branchId: string, limit = 12): Promise<AttendanceEntry[]> {
  if (!hasPermission(actor, "attendance.checkin") || !(await getAccessibleBranch(actor, branchId))) return [];
  const records = await prisma.attendance.findMany({
    where: { branchId },
    orderBy: { checkInAt: "desc" },
    take: Math.min(Math.max(limit, 1), 30),
    select: { id: true, memberId: true, checkInAt: true, method: true, overrideReason: true, member: { select: { firstName: true, lastName: true, memberCode: true } } },
  });
  return records.map((record) => ({ id: record.id, memberId: record.memberId, memberName: `${record.member.firstName} ${record.member.lastName}`, memberCode: record.member.memberCode, checkInAt: record.checkInAt, method: record.method, wasOverridden: Boolean(record.overrideReason) }));
}

export async function listMemberAttendance(actor: CurrentUser, memberId: string): Promise<AttendanceEntry[]> {
  if (!hasPermission(actor, "member.read")) return [];
  const records = await prisma.attendance.findMany({
    where: {
      memberId,
      member: { gymId: { in: [...actor.gymIds] }, ...(hasOwnerAccess(actor) ? {} : { primaryBranchId: { in: [...actor.branchIds] } }) },
    },
    orderBy: { checkInAt: "desc" },
    take: 50,
    select: { id: true, memberId: true, checkInAt: true, method: true, overrideReason: true, member: { select: { firstName: true, lastName: true, memberCode: true } } },
  });
  return records.map((record) => ({ id: record.id, memberId: record.memberId, memberName: `${record.member.firstName} ${record.member.lastName}`, memberCode: record.member.memberCode, checkInAt: record.checkInAt, method: record.method, wasOverridden: Boolean(record.overrideReason) }));
}

export async function getAttendanceReport(
  actor: CurrentUser,
  input: { branchId?: string; days: number },
): Promise<AttendanceReport | null> {
  if (!hasPermission(actor, "report.read")) return null;
  const days = Math.max(1, Math.min(input.days, 90));
  if (input.branchId && !(await getAccessibleBranch(actor, input.branchId))) return null;

  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const records = await prisma.attendance.findMany({
    where: {
      checkInAt: { gte: start },
      branch: { gymId: { in: [...actor.gymIds] } },
      ...(input.branchId
        ? { branchId: input.branchId }
        : hasOwnerAccess(actor) ? {} : { branchId: { in: [...actor.branchIds] } }),
    },
    select: { memberId: true, checkInAt: true },
  });

  const countByDay = new Map<string, number>();
  const countByHour = new Map<number, number>();
  const memberIds = new Set<string>();
  for (const record of records) {
    const day = record.checkInAt.toISOString().slice(0, 10);
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
    const hour = record.checkInAt.getUTCHours();
    countByHour.set(hour, (countByHour.get(hour) ?? 0) + 1);
    memberIds.add(record.memberId);
  }

  const daily = Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: countByDay.get(key) ?? 0 };
  });
  const peakHours = Array.from(countByHour, ([hour, count]) => ({ hour, count }))
    .sort((left, right) => right.count - left.count || left.hour - right.hour)
    .slice(0, 5);

  return { totalCheckIns: records.length, uniqueMembers: memberIds.size, daily, peakHours };
}
