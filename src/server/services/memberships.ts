import "server-only";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { type MembershipStatus, MEMBERSHIP_STATUS_LABELS } from "@/lib/memberships/constants";
import { addUtcDays, deriveMembershipStatus, extendedExpiryForFreeze, inclusiveUtcDays, membershipEndDate, renewalStartDate, startOfUtcDay } from "@/lib/memberships/dates";
import { calculateMembershipPricing } from "@/lib/memberships/pricing";
import type {
  MembershipCancellationInput,
  MembershipExpiryOverrideInput,
  MembershipFreezeInput,
  MembershipPlanInput,
  SellMembershipInput,
} from "@/lib/memberships/schemas";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { canAccessBranch, hasPermission } from "@/lib/permissions/policy";
import { createMembershipInvoice } from "@/server/services/billing";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

type MembershipRecord = {
  id: string;
  memberId: string;
  branchId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  priceMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  freezeDaysUsed: number;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  plan: { name: string; durationValue: number; durationUnit: string; freezeDaysAllowed: number };
  member: { id: string; firstName: string; lastName: string; memberCode: string; gymId: string; primaryBranchId: string };
  freezes: Array<{ id: string; startDate: Date; endDate: Date; reason: string; extendsExpiry: boolean; unfrozenAt: Date | null }>;
};

export type MembershipPlanListItem = {
  id: string;
  gymId: string;
  name: string;
  description: string | null;
  durationValue: number;
  durationUnit: "DAYS" | "MONTHS";
  durationLabel: string;
  priceMinor: number;
  registrationFeeMinor: number;
  taxRateBasisPoints: number;
  freezeDaysAllowed: number;
  graceDays: number;
  isActive: boolean;
};

export type MembershipListItem = {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  planName: string;
  branchName: string;
  startDate: Date;
  endDate: Date;
  status: MembershipStatus;
  totalMinor: number;
};

export type MembershipSaleOptions = {
  memberName: string;
  branch: { id: string; name: string };
  plans: Array<{ id: string; name: string; durationLabel: string; priceMinor: number; registrationFeeMinor: number }>;
};

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function accessibleMemberWhere(actor: CurrentUser): Prisma.MemberWhereInput {
  return {
    gymId: { in: [...actor.gymIds] },
    ...(hasOwnerAccess(actor) ? {} : { primaryBranchId: { in: [...actor.branchIds] } }),
  };
}

function durationLabel(durationValue: number, durationUnit: string): string {
  const singular = durationValue === 1;
  return `${durationValue} ${durationUnit === "MONTHS" ? (singular ? "month" : "months") : (singular ? "day" : "days")}`;
}

function deriveRecordStatus(membership: Pick<MembershipRecord, "startDate" | "endDate" | "cancelledAt" | "freezes">): MembershipStatus {
  return deriveMembershipStatus({
    startDate: membership.startDate,
    endDate: membership.endDate,
    cancelledAt: membership.cancelledAt,
    freezes: membership.freezes,
  });
}

async function getAccessibleBranch(actor: CurrentUser, branchId: string) {
  if (!canAccessBranch(actor, branchId)) return null;

  return prisma.branch.findFirst({
    where: { id: branchId, gymId: { in: [...actor.gymIds] }, isActive: true },
    select: { id: true, gymId: true, name: true, code: true },
  });
}

async function getAccessibleMembership(actor: CurrentUser, membershipId: string): Promise<MembershipRecord | null> {
  return prisma.membership.findFirst({
    where: {
      id: membershipId,
      member: accessibleMemberWhere(actor),
      ...(hasOwnerAccess(actor) ? {} : { branchId: { in: [...actor.branchIds] } }),
    },
    select: {
      id: true,
      memberId: true,
      branchId: true,
      planId: true,
      startDate: true,
      endDate: true,
      status: true,
      priceMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      freezeDaysUsed: true,
      cancelledAt: true,
      cancellationReason: true,
      plan: { select: { name: true, durationValue: true, durationUnit: true, freezeDaysAllowed: true } },
      member: { select: { id: true, firstName: true, lastName: true, memberCode: true, gymId: true, primaryBranchId: true } },
      freezes: { select: { id: true, startDate: true, endDate: true, reason: true, extendsExpiry: true, unfrozenAt: true } },
    },
  });
}

export async function listMembershipPlans(actor: CurrentUser): Promise<MembershipPlanListItem[]> {
  if (!hasPermission(actor, "membership.plan.manage")) return [];

  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: { in: [...actor.gymIds] } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      gymId: true,
      name: true,
      description: true,
      durationValue: true,
      durationUnit: true,
      priceMinor: true,
      registrationFeeMinor: true,
      taxRateBasisPoints: true,
      freezeDaysAllowed: true,
      graceDays: true,
      isActive: true,
    },
  });

  return plans.map((plan) => ({ ...plan, durationUnit: plan.durationUnit as "DAYS" | "MONTHS", durationLabel: durationLabel(plan.durationValue, plan.durationUnit) }));
}

export async function getMembershipPlanFormOptions(actor: CurrentUser): Promise<Array<{ id: string; name: string }>> {
  if (!hasPermission(actor, "membership.plan.manage")) return [];
  return prisma.gym.findMany({
    where: { id: { in: [...actor.gymIds] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getMembershipPlan(actor: CurrentUser, planId: string): Promise<MembershipPlanListItem | null> {
  if (!hasPermission(actor, "membership.plan.manage")) return null;
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId, gymId: { in: [...actor.gymIds] } },
    select: {
      id: true,
      gymId: true,
      name: true,
      description: true,
      durationValue: true,
      durationUnit: true,
      priceMinor: true,
      registrationFeeMinor: true,
      taxRateBasisPoints: true,
      freezeDaysAllowed: true,
      graceDays: true,
      isActive: true,
    },
  });
  return plan ? { ...plan, durationUnit: plan.durationUnit as "DAYS" | "MONTHS", durationLabel: durationLabel(plan.durationValue, plan.durationUnit) } : null;
}

export async function createMembershipPlan(actor: CurrentUser, input: MembershipPlanInput): Promise<ServiceResult<{ planId: string }>> {
  if (!hasPermission(actor, "membership.plan.manage") || !actor.gymIds.includes(input.gymId)) {
    return { ok: false, message: "You do not have permission to manage plans for that gym." };
  }

  try {
    const plan = await prisma.$transaction(async (transaction) => {
      const created = await transaction.membershipPlan.create({ data: input });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "MEMBERSHIP_PLAN_CREATED",
        entityType: "MembershipPlan",
        entityId: created.id,
        after: { name: created.name, durationValue: created.durationValue, durationUnit: created.durationUnit, priceMinor: created.priceMinor },
      });
      return created;
    });
    return { ok: true, data: { planId: plan.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A plan with that name already exists in this gym." };
    }
    return { ok: false, message: "Unable to save this membership plan. Please try again." };
  }
}

export async function updateMembershipPlan(actor: CurrentUser, planId: string, input: MembershipPlanInput): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "membership.plan.manage") || !actor.gymIds.includes(input.gymId)) {
    return { ok: false, message: "You do not have permission to manage that membership plan." };
  }
  const existing = await prisma.membershipPlan.findFirst({
    where: { id: planId, gymId: input.gymId },
    select: { id: true, name: true, durationValue: true, durationUnit: true, priceMinor: true },
  });
  if (!existing) return { ok: false, message: "Membership plan access was not found." };

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.membershipPlan.update({ where: { id: planId }, data: input });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "MEMBERSHIP_PLAN_UPDATED",
        entityType: "MembershipPlan",
        entityId: planId,
        before: existing,
        after: { name: input.name, durationValue: input.durationValue, durationUnit: input.durationUnit, priceMinor: input.priceMinor },
      });
    });
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A plan with that name already exists in this gym." };
    }
    return { ok: false, message: "Unable to update this membership plan. Please try again." };
  }
}

export async function setMembershipPlanActive(actor: CurrentUser, planId: string, isActive: boolean): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "membership.plan.manage")) return { ok: false, message: "You do not have permission to manage membership plans." };
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId, gymId: { in: [...actor.gymIds] } },
    select: { id: true, isActive: true },
  });
  if (!plan) return { ok: false, message: "Membership plan access was not found." };

  await prisma.$transaction(async (transaction) => {
    await transaction.membershipPlan.update({ where: { id: plan.id }, data: { isActive } });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: isActive ? "MEMBERSHIP_PLAN_REACTIVATED" : "MEMBERSHIP_PLAN_DEACTIVATED",
      entityType: "MembershipPlan",
      entityId: plan.id,
      before: { isActive: plan.isActive },
      after: { isActive },
    });
  });
  return { ok: true, data: undefined };
}

export async function sellMembership(actor: CurrentUser, input: SellMembershipInput): Promise<ServiceResult<{ membershipId: string; invoiceId: string }>> {
  if (!hasPermission(actor, "membership.sell")) return { ok: false, message: "You do not have permission to sell memberships." };
  const [branch, member, plan] = await Promise.all([
    getAccessibleBranch(actor, input.branchId),
    prisma.member.findFirst({ where: { id: input.memberId, ...accessibleMemberWhere(actor) }, select: { id: true, gymId: true, primaryBranchId: true, status: true } }),
    prisma.membershipPlan.findFirst({ where: { id: input.planId, isActive: true }, select: { id: true, name: true, gymId: true, durationValue: true, durationUnit: true, priceMinor: true, registrationFeeMinor: true, taxRateBasisPoints: true } }),
  ]);
  if (!branch || !member || !plan || member.gymId !== branch.gymId || plan.gymId !== branch.gymId || member.primaryBranchId !== branch.id) {
    return { ok: false, message: "The member, plan, or branch is not available for this sale." };
  }
  if (member.status !== "ACTIVE") return { ok: false, message: "Only active members can receive a membership." };

  const endDate = membershipEndDate(input.startDate, plan.durationValue, plan.durationUnit as "DAYS" | "MONTHS");
  const conflict = await prisma.membership.findFirst({
    where: {
      memberId: member.id,
      branchId: branch.id,
      cancelledAt: null,
      startDate: { lte: endDate },
      endDate: { gte: input.startDate },
    },
    select: { id: true },
  });
  if (conflict) return { ok: false, message: "This sale overlaps an existing membership. Renew the current membership instead." };

  let pricing;
  try {
    pricing = calculateMembershipPricing({
      priceMinor: plan.priceMinor,
      registrationFeeMinor: plan.registrationFeeMinor,
      discountMinor: input.discountMinor,
      taxRateBasisPoints: plan.taxRateBasisPoints,
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Membership pricing is invalid." };
  }

  const initialStatus = deriveMembershipStatus({ startDate: input.startDate, endDate, cancelledAt: null, freezes: [] });
  const membership = await prisma.$transaction(async (transaction) => {
    const created = await transaction.membership.create({
      data: { ...input, endDate, status: initialStatus, ...pricing, createdById: actor.id },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBERSHIP_SOLD",
      entityType: "Membership",
      entityId: created.id,
      after: { memberId: created.memberId, branchId: created.branchId, planId: created.planId, startDate: created.startDate, endDate: created.endDate, totalMinor: created.totalMinor },
    });
    const invoice = await createMembershipInvoice(transaction, {
      membershipId: created.id,
      memberId: created.memberId,
      branchId: created.branchId,
      branchCode: branch.code,
      planName: plan.name,
      issueDate: new Date(),
      subtotalMinor: created.priceMinor,
      discountMinor: created.discountMinor,
      taxMinor: created.taxMinor,
      totalMinor: created.totalMinor,
      actorUserId: actor.id,
    });
    return { membershipId: created.id, invoiceId: invoice.id };
  });
  return { ok: true, data: membership };
}

export async function getMembershipSaleOptions(actor: CurrentUser, memberId: string): Promise<MembershipSaleOptions | null> {
  if (!hasPermission(actor, "membership.sell")) return null;
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor), status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, gymId: true, primaryBranch: { select: { id: true, name: true, isActive: true } } },
  });
  if (!member || !member.primaryBranch.isActive || !canAccessBranch(actor, member.primaryBranch.id)) return null;
  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: member.gymId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, durationValue: true, durationUnit: true, priceMinor: true, registrationFeeMinor: true },
  });
  return {
    memberName: `${member.firstName} ${member.lastName}`,
    branch: { id: member.primaryBranch.id, name: member.primaryBranch.name },
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      durationLabel: durationLabel(plan.durationValue, plan.durationUnit),
      priceMinor: plan.priceMinor,
      registrationFeeMinor: plan.registrationFeeMinor,
    })),
  };
}

export async function renewMembership(actor: CurrentUser, membershipId: string): Promise<ServiceResult<{ membershipId: string }>> {
  if (!hasPermission(actor, "membership.sell")) return { ok: false, message: "You do not have permission to renew memberships." };
  const existing = await getAccessibleMembership(actor, membershipId);
  if (!existing || existing.cancelledAt) return { ok: false, message: "Membership access was not found." };

  const renewalStart = renewalStartDate(existing.endDate);
  const plan = await prisma.membershipPlan.findFirst({ where: { id: existing.planId, isActive: true }, select: { id: true } });
  if (!plan) return { ok: false, message: "Reactivate or choose another plan before renewing this membership." };
  return sellMembership(actor, { memberId: existing.memberId, branchId: existing.branchId, planId: existing.planId, startDate: renewalStart, discountMinor: 0 });
}

export async function freezeMembership(actor: CurrentUser, membershipId: string, input: MembershipFreezeInput): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "membership.sell")) return { ok: false, message: "You do not have permission to freeze memberships." };
  const membership = await getAccessibleMembership(actor, membershipId);
  if (!membership) return { ok: false, message: "Membership access was not found." };
  if (deriveRecordStatus(membership) !== "ACTIVE") return { ok: false, message: "Only active memberships can be frozen." };
  const today = startOfUtcDay(new Date());
  if (input.startDate < today || input.endDate > membership.endDate) return { ok: false, message: "Freeze dates must be within the current membership period." };
  const freezeDays = inclusiveUtcDays(input.startDate, input.endDate);
  if (membership.freezeDaysUsed + freezeDays > membership.plan.freezeDaysAllowed) {
    return { ok: false, message: "This freeze exceeds the plan's remaining freeze allowance." };
  }

  const newEndDate = extendedExpiryForFreeze(membership.endDate, input.startDate, input.endDate);
  await prisma.$transaction(async (transaction) => {
    await transaction.membershipFreeze.create({
      data: { membershipId, startDate: input.startDate, endDate: input.endDate, reason: input.reason, extendsExpiry: true, createdById: actor.id },
    });
    await transaction.membership.update({
      where: { id: membershipId },
      data: { endDate: newEndDate, freezeDaysUsed: membership.freezeDaysUsed + freezeDays, status: input.startDate <= today ? "FROZEN" : "ACTIVE" },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBERSHIP_FROZEN",
      entityType: "Membership",
      entityId: membershipId,
      before: { endDate: membership.endDate, freezeDaysUsed: membership.freezeDaysUsed },
      after: { startDate: input.startDate, endDate: input.endDate, membershipEndDate: newEndDate, freezeDaysUsed: membership.freezeDaysUsed + freezeDays },
    });
  });
  return { ok: true, data: undefined };
}

export async function unfreezeMembership(actor: CurrentUser, membershipId: string): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "membership.sell")) return { ok: false, message: "You do not have permission to unfreeze memberships." };
  const membership = await getAccessibleMembership(actor, membershipId);
  if (!membership) return { ok: false, message: "Membership access was not found." };
  const today = startOfUtcDay(new Date());
  const freeze = membership.freezes.find((item) => item.unfrozenAt === null && item.startDate <= today && today <= item.endDate);
  if (!freeze) return { ok: false, message: "This membership does not have an active freeze." };

  const scheduledDays = inclusiveUtcDays(freeze.startDate, freeze.endDate);
  const usedDays = Math.max(0, inclusiveUtcDays(freeze.startDate, addUtcDays(today, -1)));
  const unusedDays = scheduledDays - usedDays;
  const newEndDate = freeze.extendsExpiry ? addUtcDays(membership.endDate, -unusedDays) : membership.endDate;
  const newFreezeDaysUsed = freeze.extendsExpiry ? membership.freezeDaysUsed - unusedDays : membership.freezeDaysUsed;

  await prisma.$transaction(async (transaction) => {
    await transaction.membershipFreeze.update({ where: { id: freeze.id }, data: { unfrozenAt: new Date() } });
    await transaction.membership.update({ where: { id: membershipId }, data: { endDate: newEndDate, freezeDaysUsed: newFreezeDaysUsed, status: "ACTIVE" } });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBERSHIP_UNFROZEN",
      entityType: "Membership",
      entityId: membershipId,
      before: { endDate: membership.endDate, freezeDaysUsed: membership.freezeDaysUsed },
      after: { endDate: newEndDate, freezeDaysUsed: newFreezeDaysUsed, unusedFreezeDays: unusedDays },
    });
  });
  return { ok: true, data: undefined };
}

export async function cancelMembership(actor: CurrentUser, membershipId: string, input: MembershipCancellationInput): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "membership.sell")) return { ok: false, message: "You do not have permission to cancel memberships." };
  const membership = await getAccessibleMembership(actor, membershipId);
  if (!membership || membership.cancelledAt) return { ok: false, message: "Membership access was not found or it is already cancelled." };
  const cancelledAt = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.membership.update({ where: { id: membershipId }, data: { status: "CANCELLED", cancelledAt, cancellationReason: input.reason } });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBERSHIP_CANCELLED",
      entityType: "Membership",
      entityId: membershipId,
      before: { status: membership.status, endDate: membership.endDate },
      after: { cancelledAt, reason: input.reason },
    });
  });
  return { ok: true, data: undefined };
}

export async function overrideMembershipExpiry(actor: CurrentUser, membershipId: string, input: MembershipExpiryOverrideInput): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "membership.override")) return { ok: false, message: "You do not have permission to override membership expiry." };
  const membership = await getAccessibleMembership(actor, membershipId);
  if (!membership || membership.cancelledAt) return { ok: false, message: "Membership access was not found." };
  if (input.endDate < membership.startDate) return { ok: false, message: "Expiry cannot be before the membership start date." };

  const status = deriveMembershipStatus({ ...membership, endDate: input.endDate });
  await prisma.$transaction(async (transaction) => {
    await transaction.membership.update({ where: { id: membershipId }, data: { endDate: input.endDate, status } });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBERSHIP_EXPIRY_OVERRIDDEN",
      entityType: "Membership",
      entityId: membershipId,
      before: { endDate: membership.endDate },
      after: { endDate: input.endDate, reason: input.reason },
    });
  });
  return { ok: true, data: undefined };
}

export async function listMemberships(actor: CurrentUser, status?: MembershipStatus, memberId?: string): Promise<MembershipListItem[]> {
  if (!hasPermission(actor, "membership.sell") && !hasPermission(actor, "member.read")) return [];
  const memberships = await prisma.membership.findMany({
    where: {
      member: accessibleMemberWhere(actor),
      ...(memberId ? { memberId } : {}),
      ...(hasOwnerAccess(actor) ? {} : { branchId: { in: [...actor.branchIds] } }),
    },
    orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      memberId: true,
      startDate: true,
      endDate: true,
      cancelledAt: true,
      totalMinor: true,
      member: { select: { firstName: true, lastName: true, memberCode: true } },
      branch: { select: { name: true } },
      plan: { select: { name: true } },
      freezes: { select: { startDate: true, endDate: true, unfrozenAt: true } },
    },
  });
  const items = memberships.map((membership) => ({
    id: membership.id,
    memberId: membership.memberId,
    memberName: `${membership.member.firstName} ${membership.member.lastName}`,
    memberCode: membership.member.memberCode,
    planName: membership.plan.name,
    branchName: membership.branch.name,
    startDate: membership.startDate,
    endDate: membership.endDate,
    status: deriveMembershipStatus(membership),
    totalMinor: membership.totalMinor,
  }));
  return status ? items.filter((item) => item.status === status) : items;
}

export async function listExpiringMemberships(actor: CurrentUser, days = 30): Promise<MembershipListItem[]> {
  const cutoff = addUtcDays(new Date(), Math.max(0, Math.min(days, 365)));
  const memberships = await listMemberships(actor);
  return memberships.filter((membership) => membership.status === "ACTIVE" && membership.endDate <= cutoff);
}

export { MEMBERSHIP_STATUS_LABELS };
