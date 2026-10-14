import "server-only";

import type { CurrentUser } from "@/lib/auth/session";
import { addUtcDays, timezoneDateKey, timezoneHour, timezoneStartOfDay } from "@/lib/reports/filters";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";

export type ReportFilters = {
  start: Date;
  end: Date;
  branchId?: string;
};

export type ReportBranchOption = {
  id: string;
  label: string;
};

type ReportScope = {
  branchIds: string[];
  currency: string;
  timezone: string;
};

type DailyMetric = {
  date: string;
  value: number;
  secondaryValue?: number;
};

export type OperationalReport = {
  members: {
    total: number;
    active: number;
    inactive: number;
    activeMemberships: number;
    newJoins: number;
    membershipsSold: number;
    renewals: number;
    expiredMemberships: number;
    expiringMemberships: number;
    statusCounts: Array<{ status: string; count: number }>;
    planDistribution: Array<{ planName: string; count: number }>;
    expiring: Array<{
      id: string;
      memberId: string;
      memberName: string;
      memberCode: string;
      planName: string;
      branchName: string;
      endDate: Date;
    }>;
  };
  attendance: {
    totalCheckIns: number;
    uniqueMembers: number;
    daily: DailyMetric[];
    peakHours: Array<{ hour: number; count: number }>;
    frequentMembers: Array<{
      memberId: string;
      memberName: string;
      memberCode: string;
      checkIns: number;
    }>;
  };
  staffing: {
    assignedMembers: number;
    trainers: Array<{ trainerId: string; trainerName: string; assignedMembers: number }>;
  };
  classes: {
    sessions: number;
    booked: number;
    capacity: number;
    occupancyPercent: number;
    byClass: Array<{ className: string; sessions: number; booked: number; capacity: number }>;
  };
  maintenance: {
    totalMinor: number;
    records: Array<{
      id: string;
      equipmentName: string;
      branchName: string;
      serviceType: string;
      costMinor: number;
      servicedAt: Date;
    }>;
    overdue: Array<{ id: string; name: string; assetCode: string; branchName: string; nextServiceAt: Date }>;
  };
};

export type FinancialReport = {
  grossMinor: number;
  refundedMinor: number;
  netMinor: number;
  outstandingMinor: number;
  outstandingInvoices: number;
  daily: DailyMetric[];
  paymentsByMethod: Array<{ method: string; grossMinor: number; refundedMinor: number; netMinor: number }>;
  revenueByPlan: Array<{ planName: string; totalMinor: number }>;
  outstanding: Array<{
    id: string;
    memberId: string;
    memberName: string;
    memberCode: string;
    invoiceNumber: string;
    branchName: string;
    issueDate: Date;
    balanceMinor: number;
  }>;
  recentPayments: Array<{
    id: string;
    memberId: string;
    memberName: string;
    memberCode: string;
    invoiceNumber: string;
    method: string;
    amountMinor: number;
    paidAt: Date;
  }>;
};

export type Reports = {
  currency: string;
  timezone: string;
  filters: ReportFilters;
  operational: OperationalReport | null;
  finance: FinancialReport | null;
};

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function canReadReports(actor: CurrentUser): boolean {
  return hasPermission(actor, "report.read") || hasPermission(actor, "report.finance");
}

function dateSeries(start: Date, end: Date, values: ReadonlyMap<string, number>, secondaryValues?: ReadonlyMap<string, number>): DailyMetric[] {
  const entries: DailyMetric[] = [];
  for (let day = start; day < end; day = addUtcDays(day, 1)) {
    const date = day.toISOString().slice(0, 10);
    entries.push({
      date,
      value: values.get(date) ?? 0,
      ...(secondaryValues ? { secondaryValue: secondaryValues.get(date) ?? 0 } : {}),
    });
  }
  return entries;
}

function increment(map: Map<string | number, number>, key: string | number, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

async function resolveReportScope(actor: CurrentUser, branchId?: string): Promise<ReportScope | null> {
  if (!canReadReports(actor)) return null;

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

  const accessibleBranchIds = branches.map((branch) => branch.id);
  if (branchId && !accessibleBranchIds.includes(branchId)) return null;

  return {
    branchIds: branchId ? [branchId] : accessibleBranchIds,
    currency: gym?.currency ?? "PKR",
    timezone: gym?.timezone ?? "UTC",
  };
}

export async function getReportBranchOptions(actor: CurrentUser): Promise<ReportBranchOption[]> {
  if (!canReadReports(actor)) return [];

  const branches = await prisma.branch.findMany({
    where: {
      gymId: { in: [...actor.gymIds] },
      ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, isActive: true },
  });

  return branches.map((branch) => ({
    id: branch.id,
    label: `${branch.name} (${branch.code})${branch.isActive ? "" : " — inactive"}`,
  }));
}

async function getOperationalReport(
  scope: ReportScope,
  filters: ReportFilters,
): Promise<OperationalReport> {
  const rangeStart = timezoneStartOfDay(filters.start, scope.timezone);
  const rangeEnd = timezoneStartOfDay(filters.end, scope.timezone);
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const expiryCutoff = addUtcDays(today, 30);
  const branchFilter = { in: scope.branchIds };
  const activeMembershipWhere = {
    branchId: branchFilter,
    cancelledAt: null,
    startDate: { lte: today },
    endDate: { gte: today },
    member: { status: "ACTIVE" },
    freezes: {
      none: {
        unfrozenAt: null,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    },
  };

  const [
    statusCounts,
    newJoins,
    membershipsSold,
    renewals,
    activeMemberships,
    expiredMemberships,
    expiringMemberships,
    expiring,
    attendance,
    assignments,
    classSessions,
    maintenanceRecords,
    overdueEquipment,
  ] = await Promise.all([
    prisma.member.groupBy({
      by: ["status"],
      where: { primaryBranchId: branchFilter },
      _count: { _all: true },
    }),
    prisma.member.count({
      where: { primaryBranchId: branchFilter, joinDate: { gte: rangeStart, lt: rangeEnd } },
    }),
    prisma.membership.count({
      where: { branchId: branchFilter, createdAt: { gte: rangeStart, lt: rangeEnd } },
    }),
    prisma.membership.count({
      where: { branchId: branchFilter, isRenewal: true, createdAt: { gte: rangeStart, lt: rangeEnd } },
    }),
    prisma.membership.findMany({
      where: activeMembershipWhere,
      select: { memberId: true, plan: { select: { name: true } } },
    }),
    prisma.membership.count({
      where: { branchId: branchFilter, cancelledAt: null, endDate: { lt: today } },
    }),
    prisma.membership.count({
      where: {
        ...activeMembershipWhere,
        endDate: { gte: today, lte: expiryCutoff },
      },
    }),
    prisma.membership.findMany({
      where: {
        ...activeMembershipWhere,
        endDate: { gte: today, lte: expiryCutoff },
      },
      orderBy: { endDate: "asc" },
      take: 8,
      select: {
        id: true,
        endDate: true,
        member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
        plan: { select: { name: true } },
        branch: { select: { name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { branchId: branchFilter, checkInAt: { gte: rangeStart, lt: rangeEnd } },
      select: {
        memberId: true,
        checkInAt: true,
        member: { select: { firstName: true, lastName: true, memberCode: true } },
      },
    }),
    prisma.member.groupBy({
      by: ["assignedTrainerId"],
      where: { primaryBranchId: branchFilter, assignedTrainerId: { not: null } },
      _count: { _all: true },
    }),
    prisma.classSession.findMany({
      where: { branchId: branchFilter, startsAt: { gte: rangeStart, lt: rangeEnd } },
      select: { capacity: true, bookedCount: true, fitnessClass: { select: { name: true } } },
    }),
    prisma.maintenanceRecord.findMany({
      where: {
        equipment: { branchId: branchFilter },
        servicedAt: { gte: rangeStart, lt: rangeEnd },
      },
      orderBy: { servicedAt: "desc" },
      take: 20,
      select: {
        id: true,
        servicedAt: true,
        serviceType: true,
        costMinor: true,
        equipment: { select: { name: true, branch: { select: { name: true } } } },
      },
    }),
    prisma.equipment.findMany({
      where: {
        branchId: branchFilter,
        status: { not: "RETIRED" },
        nextServiceAt: { lte: new Date() },
      },
      orderBy: { nextServiceAt: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        assetCode: true,
        nextServiceAt: true,
        branch: { select: { name: true } },
      },
    }),
  ]);

  const trainerIds = assignments.flatMap((assignment) => assignment.assignedTrainerId ? [assignment.assignedTrainerId] : []);
  const trainers = trainerIds.length === 0
    ? []
    : await prisma.user.findMany({
      where: { id: { in: trainerIds } },
      select: { id: true, name: true },
    });
  const trainerNameById = new Map(trainers.map((trainer) => [trainer.id, trainer.name]));

  const totalMembers = statusCounts.reduce((total, group) => total + group._count._all, 0);
  const activeMemberStatusCount = statusCounts.find((group) => group.status === "ACTIVE")?._count._all ?? 0;
  const planCounts = new Map<string, number>();
  const activeMemberIds = new Set<string>();
  for (const membership of activeMemberships) {
    activeMemberIds.add(membership.memberId);
    increment(planCounts, membership.plan.name);
  }

  const checkInsByDay = new Map<string, number>();
  const checkInsByHour = new Map<number, number>();
  const checkInsByMember = new Map<string, { memberName: string; memberCode: string; checkIns: number }>();
  for (const entry of attendance) {
    increment(checkInsByDay, timezoneDateKey(entry.checkInAt, scope.timezone));
    increment(checkInsByHour, timezoneHour(entry.checkInAt, scope.timezone));
    const member = checkInsByMember.get(entry.memberId) ?? {
      memberName: `${entry.member.firstName} ${entry.member.lastName}`,
      memberCode: entry.member.memberCode,
      checkIns: 0,
    };
    member.checkIns += 1;
    checkInsByMember.set(entry.memberId, member);
  }

  const classesByName = new Map<string, { sessions: number; booked: number; capacity: number }>();
  for (const session of classSessions) {
    const value = classesByName.get(session.fitnessClass.name) ?? { sessions: 0, booked: 0, capacity: 0 };
    value.sessions += 1;
    value.booked += session.bookedCount;
    value.capacity += session.capacity;
    classesByName.set(session.fitnessClass.name, value);
  }
  const totalCapacity = classSessions.reduce((total, session) => total + session.capacity, 0);
  const totalBooked = classSessions.reduce((total, session) => total + session.bookedCount, 0);

  return {
    members: {
      total: totalMembers,
      active: activeMemberStatusCount,
      inactive: totalMembers - activeMemberStatusCount,
      activeMemberships: activeMemberIds.size,
      newJoins,
      membershipsSold,
      renewals,
      expiredMemberships,
      expiringMemberships,
      statusCounts: statusCounts
        .map((group) => ({ status: group.status, count: group._count._all }))
        .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status)),
      planDistribution: Array.from(planCounts, ([planName, count]) => ({ planName, count }))
        .sort((left, right) => right.count - left.count || left.planName.localeCompare(right.planName)),
      expiring: expiring.map((membership) => ({
        id: membership.id,
        memberId: membership.member.id,
        memberName: `${membership.member.firstName} ${membership.member.lastName}`,
        memberCode: membership.member.memberCode,
        planName: membership.plan.name,
        branchName: membership.branch.name,
        endDate: membership.endDate,
      })),
    },
    attendance: {
      totalCheckIns: attendance.length,
      uniqueMembers: checkInsByMember.size,
      daily: dateSeries(filters.start, filters.end, checkInsByDay),
      peakHours: Array.from(checkInsByHour, ([hour, count]) => ({ hour, count }))
        .sort((left, right) => right.count - left.count || left.hour - right.hour)
        .slice(0, 5),
      frequentMembers: Array.from(checkInsByMember, ([memberId, member]) => ({ memberId, ...member }))
        .sort((left, right) => right.checkIns - left.checkIns || left.memberName.localeCompare(right.memberName))
        .slice(0, 10),
    },
    staffing: {
      assignedMembers: assignments.reduce((total, assignment) => total + assignment._count._all, 0),
      trainers: assignments.flatMap((assignment) => {
        if (!assignment.assignedTrainerId) return [];
        const trainerName = trainerNameById.get(assignment.assignedTrainerId);
        return trainerName ? [{
          trainerId: assignment.assignedTrainerId,
          trainerName,
          assignedMembers: assignment._count._all,
        }] : [];
      }).sort((left, right) => right.assignedMembers - left.assignedMembers || left.trainerName.localeCompare(right.trainerName)),
    },
    classes: {
      sessions: classSessions.length,
      booked: totalBooked,
      capacity: totalCapacity,
      occupancyPercent: totalCapacity === 0 ? 0 : Math.round((totalBooked / totalCapacity) * 100),
      byClass: Array.from(classesByName, ([className, values]) => ({ className, ...values }))
        .sort((left, right) => right.booked - left.booked || left.className.localeCompare(right.className)),
    },
    maintenance: {
      totalMinor: maintenanceRecords.reduce((total, record) => total + record.costMinor, 0),
      records: maintenanceRecords.map((record) => ({
        id: record.id,
        equipmentName: record.equipment.name,
        branchName: record.equipment.branch.name,
        serviceType: record.serviceType,
        costMinor: record.costMinor,
        servicedAt: record.servicedAt,
      })),
      overdue: overdueEquipment.flatMap((equipment) => equipment.nextServiceAt ? [{
        id: equipment.id,
        name: equipment.name,
        assetCode: equipment.assetCode,
        branchName: equipment.branch.name,
        nextServiceAt: equipment.nextServiceAt,
      }] : []),
    },
  };
}

async function getFinancialReport(scope: ReportScope, filters: ReportFilters): Promise<FinancialReport> {
  const rangeStart = timezoneStartOfDay(filters.start, scope.timezone);
  const rangeEnd = timezoneStartOfDay(filters.end, scope.timezone);
  const branchFilter = { in: scope.branchIds };
  const [payments, refunds, invoiceItems, outstandingAggregate, outstanding] = await Promise.all([
    prisma.payment.findMany({
      where: { branchId: branchFilter, paidAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amountMinor: true,
        method: true,
        paidAt: true,
        member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),
    prisma.refund.findMany({
      where: { createdAt: { gte: rangeStart, lt: rangeEnd }, payment: { branchId: branchFilter } },
      select: { amountMinor: true, createdAt: true, payment: { select: { method: true } } },
    }),
    prisma.invoiceItem.findMany({
      where: {
        membershipId: { not: null },
        invoice: {
          branchId: branchFilter,
          issueDate: { gte: rangeStart, lt: rangeEnd },
          status: { not: "VOID" },
        },
      },
      select: { totalMinor: true, membership: { select: { plan: { select: { name: true } } } } },
    }),
    prisma.invoice.aggregate({
      where: { branchId: branchFilter, status: { in: ["UNPAID", "PARTIALLY_PAID"] }, balanceMinor: { gt: 0 } },
      _sum: { balanceMinor: true },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: { branchId: branchFilter, status: { in: ["UNPAID", "PARTIALLY_PAID"] }, balanceMinor: { gt: 0 } },
      orderBy: [{ balanceMinor: "desc" }, { issueDate: "asc" }],
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        balanceMinor: true,
        member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
        branch: { select: { name: true } },
      },
    }),
  ]);

  const grossByDay = new Map<string, number>();
  const refundByDay = new Map<string, number>();
  const methods = new Map<string, { grossMinor: number; refundedMinor: number }>();
  for (const payment of payments) {
    increment(grossByDay, timezoneDateKey(payment.paidAt, scope.timezone), payment.amountMinor);
    const method = methods.get(payment.method) ?? { grossMinor: 0, refundedMinor: 0 };
    method.grossMinor += payment.amountMinor;
    methods.set(payment.method, method);
  }
  for (const refund of refunds) {
    increment(refundByDay, timezoneDateKey(refund.createdAt, scope.timezone), refund.amountMinor);
    const method = methods.get(refund.payment.method) ?? { grossMinor: 0, refundedMinor: 0 };
    method.refundedMinor += refund.amountMinor;
    methods.set(refund.payment.method, method);
  }

  const planRevenue = new Map<string, number>();
  for (const item of invoiceItems) {
    if (item.membership) increment(planRevenue, item.membership.plan.name, item.totalMinor);
  }

  const grossMinor = payments.reduce((total, payment) => total + payment.amountMinor, 0);
  const refundedMinor = refunds.reduce((total, refund) => total + refund.amountMinor, 0);
  return {
    grossMinor,
    refundedMinor,
    netMinor: grossMinor - refundedMinor,
    outstandingMinor: outstandingAggregate._sum.balanceMinor ?? 0,
    outstandingInvoices: outstandingAggregate._count._all,
    daily: dateSeries(filters.start, filters.end, grossByDay, refundByDay),
    paymentsByMethod: Array.from(methods, ([method, totals]) => ({
      method,
      grossMinor: totals.grossMinor,
      refundedMinor: totals.refundedMinor,
      netMinor: totals.grossMinor - totals.refundedMinor,
    })).sort((left, right) => right.netMinor - left.netMinor || left.method.localeCompare(right.method)),
    revenueByPlan: Array.from(planRevenue, ([planName, totalMinor]) => ({ planName, totalMinor }))
      .sort((left, right) => right.totalMinor - left.totalMinor || left.planName.localeCompare(right.planName)),
    outstanding: outstanding.map((invoice) => ({
      id: invoice.id,
      memberId: invoice.member.id,
      memberName: `${invoice.member.firstName} ${invoice.member.lastName}`,
      memberCode: invoice.member.memberCode,
      invoiceNumber: invoice.invoiceNumber,
      branchName: invoice.branch.name,
      issueDate: invoice.issueDate,
      balanceMinor: invoice.balanceMinor,
    })),
    recentPayments: payments.slice(0, 6).map((payment) => ({
      id: payment.id,
      memberId: payment.member.id,
      memberName: `${payment.member.firstName} ${payment.member.lastName}`,
      memberCode: payment.member.memberCode,
      invoiceNumber: payment.invoice.invoiceNumber,
      method: payment.method,
      amountMinor: payment.amountMinor,
      paidAt: payment.paidAt,
    })),
  };
}

export async function getReports(actor: CurrentUser, filters: ReportFilters): Promise<Reports | null> {
  const scope = await resolveReportScope(actor, filters.branchId);
  if (!scope) return null;

  const canReadOperational = hasPermission(actor, "report.read");
  const canReadFinancial = hasPermission(actor, "report.finance");
  const [operational, finance] = await Promise.all([
    canReadOperational ? getOperationalReport(scope, filters) : Promise.resolve(null),
    canReadFinancial ? getFinancialReport(scope, filters) : Promise.resolve(null),
  ]);

  return {
    currency: scope.currency,
    timezone: scope.timezone,
    filters,
    operational,
    finance,
  };
}
