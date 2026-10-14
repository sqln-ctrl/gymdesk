import "server-only";

import type { CurrentUser } from "@/lib/auth/session";
import { addUtcDays, parseDateInput, timezoneDateKey, timezoneStartOfDay } from "@/lib/reports/filters";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";
import { getReports, type Reports } from "@/server/services/reports";

type DashboardScope = {
  branchIds: string[];
  currency: string;
  timezone: string;
};

export type DashboardData =
  | { kind: "management"; reports: Reports }
  | {
    kind: "reception";
    todayCheckIns: number;
    outstandingMinor: number | null;
    currency: string;
    timezone: string;
    expiring: Array<{ id: string; memberId: string; memberName: string; planName: string; endDate: Date }>;
    upcomingClasses: Array<{ id: string; className: string; branchName: string; startsAt: Date; bookedCount: number; capacity: number }>;
  }
  | {
    kind: "trainer";
    assignedMembers: number;
    membersWithoutActivePlan: number;
    timezone: string;
    todayClasses: Array<{ id: string; className: string; branchName: string; startsAt: Date; bookedCount: number; capacity: number }>;
    recentProgress: Array<{ id: string; memberId: string; memberName: string; recordedAt: Date }>;
  };

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function isTrainerOnly(actor: CurrentUser): boolean {
  return actor.roleKeys.includes("TRAINER")
    && !actor.roleKeys.includes("BRANCH_ADMIN")
    && !hasOwnerAccess(actor);
}

async function getDashboardScope(actor: CurrentUser): Promise<DashboardScope> {
  const [branches, gym] = await Promise.all([
    prisma.branch.findMany({
      where: {
        gymId: { in: [...actor.gymIds] },
        ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
      },
      select: { id: true },
    }),
    prisma.gym.findFirst({
      where: { id: { in: [...actor.gymIds] } },
      select: { currency: true, timezone: true },
    }),
  ]);
  return {
    branchIds: branches.map((branch) => branch.id),
    currency: gym?.currency ?? "PKR",
    timezone: gym?.timezone ?? "UTC",
  };
}

function todayRange(timezone: string): { start: Date; end: Date; day: Date } {
  const day = parseDateInput(timezoneDateKey(new Date(), timezone)) ?? new Date();
  return {
    start: timezoneStartOfDay(day, timezone),
    end: timezoneStartOfDay(addUtcDays(day, 1), timezone),
    day,
  };
}

async function getReceptionDashboard(actor: CurrentUser): Promise<Extract<DashboardData, { kind: "reception" }>> {
  const scope = await getDashboardScope(actor);
  const branchFilter = { in: scope.branchIds };
  const { start, end, day } = todayRange(scope.timezone);
  const expiryCutoff = addUtcDays(day, 30);
  const canSeeInvoices = hasPermission(actor, "invoice.read");

  const [todayCheckIns, outstanding, expiring, upcomingClasses] = await Promise.all([
    hasPermission(actor, "attendance.checkin")
      ? prisma.attendance.count({ where: { branchId: branchFilter, checkInAt: { gte: start, lt: end } } })
      : Promise.resolve(0),
    canSeeInvoices
      ? prisma.invoice.aggregate({
        where: { branchId: branchFilter, status: { in: ["UNPAID", "PARTIALLY_PAID"] }, balanceMinor: { gt: 0 } },
        _sum: { balanceMinor: true },
      })
      : Promise.resolve(null),
    hasPermission(actor, "membership.sell") || hasPermission(actor, "member.read")
      ? prisma.membership.findMany({
        where: {
          branchId: branchFilter,
          cancelledAt: null,
          startDate: { lte: day },
          endDate: { gte: day, lte: expiryCutoff },
          member: { status: "ACTIVE" },
          freezes: { none: { unfrozenAt: null, startDate: { lte: day }, endDate: { gte: day } } },
        },
        orderBy: { endDate: "asc" },
        take: 6,
        select: {
          id: true,
          endDate: true,
          member: { select: { id: true, firstName: true, lastName: true } },
          plan: { select: { name: true } },
        },
      })
      : Promise.resolve([]),
    (hasPermission(actor, "class.read") || hasPermission(actor, "class.book"))
      ? prisma.classSession.findMany({
        where: { branchId: branchFilter, startsAt: { gte: start, lt: end } },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: { id: true, startsAt: true, bookedCount: true, capacity: true, branch: { select: { name: true } }, fitnessClass: { select: { name: true } } },
      })
      : Promise.resolve([]),
  ]);

  return {
    kind: "reception",
    todayCheckIns,
    outstandingMinor: outstanding?._sum.balanceMinor ?? null,
    currency: scope.currency,
    timezone: scope.timezone,
    expiring: expiring.map((membership) => ({
      id: membership.id,
      memberId: membership.member.id,
      memberName: `${membership.member.firstName} ${membership.member.lastName}`,
      planName: membership.plan.name,
      endDate: membership.endDate,
    })),
    upcomingClasses: upcomingClasses.map((session) => ({
      id: session.id,
      className: session.fitnessClass.name,
      branchName: session.branch.name,
      startsAt: session.startsAt,
      bookedCount: session.bookedCount,
      capacity: session.capacity,
    })),
  };
}

async function getTrainerDashboard(actor: CurrentUser): Promise<Extract<DashboardData, { kind: "trainer" }>> {
  const scope = await getDashboardScope(actor);
  const branchFilter = { in: scope.branchIds };
  const { start, end } = todayRange(scope.timezone);
  const memberWhere = { assignedTrainerId: actor.id, primaryBranchId: branchFilter };
  const [members, todayClasses, recentProgress] = await Promise.all([
    prisma.member.findMany({
      where: memberWhere,
      select: { id: true, workoutPlans: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } },
    }),
    prisma.classSession.findMany({
      where: {
        branchId: branchFilter,
        startsAt: { gte: start, lt: end },
        fitnessClass: { trainerId: actor.id },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
      select: { id: true, startsAt: true, bookedCount: true, capacity: true, branch: { select: { name: true } }, fitnessClass: { select: { name: true } } },
    }),
    prisma.progressEntry.findMany({
      where: { member: memberWhere },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, recordedAt: true, member: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  return {
    kind: "trainer",
    assignedMembers: members.length,
    membersWithoutActivePlan: members.filter((member) => member.workoutPlans.length === 0).length,
    timezone: scope.timezone,
    todayClasses: todayClasses.map((session) => ({
      id: session.id,
      className: session.fitnessClass.name,
      branchName: session.branch.name,
      startsAt: session.startsAt,
      bookedCount: session.bookedCount,
      capacity: session.capacity,
    })),
    recentProgress: recentProgress.map((entry) => ({
      id: entry.id,
      memberId: entry.member.id,
      memberName: `${entry.member.firstName} ${entry.member.lastName}`,
      recordedAt: entry.recordedAt,
    })),
  };
}

export async function getDashboard(actor: CurrentUser): Promise<DashboardData> {
  if (isTrainerOnly(actor)) return getTrainerDashboard(actor);

  if (hasPermission(actor, "report.read") || hasPermission(actor, "report.finance")) {
    const scope = await getDashboardScope(actor);
    const { day } = todayRange(scope.timezone);
    const reports = await getReports(actor, { start: addUtcDays(day, -29), end: addUtcDays(day, 1) });
    if (reports) return { kind: "management", reports };
  }

  return getReceptionDashboard(actor);
}
