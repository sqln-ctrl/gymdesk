import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { MEMBER_STATUS_LABELS, type MemberStatus } from "@/lib/members/constants";
import type { MemberInput } from "@/lib/members/schemas";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { canAccessBranch, hasPermission } from "@/lib/permissions/policy";

const PAGE_SIZE = 20;

export type MemberListItem = {
  id: string;
  memberCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: MemberStatus;
  branchName: string;
  trainerName: string | null;
  joinDate: Date;
};

export type MemberFormOptions = {
  branches: Array<{ id: string; label: string }>;
  trainers: Array<{ id: string; name: string }>;
};

export type MemberDetail = {
  id: string;
  memberCode: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
  assignedTrainerId: string | null;
  assignedTrainerName: string | null;
  notes: string | null;
  status: MemberStatus;
  joinDate: Date;
  branch: { id: string; name: string; code: string };
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

function createMemberCode(): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `MBR-${new Date().getUTCFullYear()}-${suffix}`;
}

async function getAccessibleBranch(actor: CurrentUser, branchId: string) {
  if (!canAccessBranch(actor, branchId)) {
    return null;
  }

  return prisma.branch.findFirst({
    where: { id: branchId, gymId: { in: [...actor.gymIds] }, isActive: true },
    select: { id: true, gymId: true },
  });
}

async function trainerIsEligible(trainerId: string | undefined, branchId: string): Promise<boolean> {
  if (!trainerId) {
    return true;
  }

  const trainer = await prisma.user.findFirst({
    where: {
      id: trainerId,
      status: "ACTIVE",
      roles: { some: { role: { key: "TRAINER" } } },
      branchAssignments: { some: { branchId } },
    },
    select: { id: true },
  });

  return Boolean(trainer);
}

export async function getMemberFormOptions(actor: CurrentUser): Promise<MemberFormOptions> {
  if (
    !hasPermission(actor, "member.read") &&
    !hasPermission(actor, "member.create") &&
    !hasPermission(actor, "member.update")
  ) {
    return { branches: [], trainers: [] };
  }

  const branches = await prisma.branch.findMany({
    where: {
      gymId: { in: [...actor.gymIds] },
      isActive: true,
      ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  const trainers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      roles: { some: { role: { key: "TRAINER" } } },
      branchAssignments: {
        some: {
          ...(hasOwnerAccess(actor)
            ? { branch: { gymId: { in: [...actor.gymIds] } } }
            : { branchId: { in: [...actor.branchIds] } }),
        },
      },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return {
    branches: branches.map((branch) => ({ id: branch.id, label: `${branch.name} (${branch.code})` })),
    trainers,
  };
}

export async function listMembers(
  actor: CurrentUser,
  input: { page: number; search?: string; status?: MemberStatus; branchId?: string },
): Promise<{ items: MemberListItem[]; total: number; page: number; pageCount: number }> {
  const page = Math.max(1, input.page);

  if (!hasPermission(actor, "member.read")) {
    return { items: [], total: 0, page, pageCount: 1 };
  }

  const branchId = input.branchId && canAccessBranch(actor, input.branchId) ? input.branchId : undefined;
  const search = input.search?.trim();
  const where: Prisma.MemberWhereInput = {
    ...accessibleMemberWhere(actor),
    ...(branchId ? { primaryBranchId: branchId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { memberCode: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };
  const total = await prisma.member.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resolvedPage = Math.min(page, pageCount);
  const members = await prisma.member.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { lastName: "asc" }],
    skip: (resolvedPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      memberCode: true,
      avatarUrl: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      status: true,
      joinDate: true,
      primaryBranch: { select: { name: true } },
      assignedTrainer: { select: { name: true } },
    },
  });

  return {
    items: members.map((member) => ({
      id: member.id,
      memberCode: member.memberCode,
      fullName: `${member.firstName} ${member.lastName}`,
      phone: member.phone,
      email: member.email,
      status: member.status as MemberStatus,
      joinDate: member.joinDate,
      branchName: member.primaryBranch.name,
      trainerName: member.assignedTrainer?.name ?? null,
    })),
    total,
    page: resolvedPage,
    pageCount,
  };
}

export async function getMemberDetail(actor: CurrentUser, memberId: string): Promise<MemberDetail | null> {
  if (!hasPermission(actor, "member.read")) {
    return null;
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      address: true,
      assignedTrainerId: true,
      notes: true,
      status: true,
      joinDate: true,
      primaryBranch: { select: { id: true, name: true, code: true } },
      assignedTrainer: { select: { name: true } },
    },
  });

  if (!member) {
    return null;
  }

  const { primaryBranch, assignedTrainer, ...detail } = member;

  return {
    ...detail,
    status: member.status as MemberStatus,
    branch: primaryBranch,
    assignedTrainerName: assignedTrainer?.name ?? null,
  };
}

export async function createMember(
  actor: CurrentUser,
  input: MemberInput,
): Promise<{ ok: true; memberId: string } | { ok: false; message: string }> {
  if (!hasPermission(actor, "member.create")) {
    return { ok: false, message: "You do not have permission to create members." };
  }

  const branch = await getAccessibleBranch(actor, input.primaryBranchId);
  if (!branch) {
    return { ok: false, message: "You cannot add a member to that branch." };
  }

  if (!(await trainerIsEligible(input.assignedTrainerId, branch.id))) {
    return { ok: false, message: "Choose a trainer assigned to the selected branch." };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const member = await prisma.$transaction(async (transaction) => {
        const created = await transaction.member.create({
          data: {
            gymId: branch.gymId,
            primaryBranchId: branch.id,
            memberCode: createMemberCode(),
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone ?? null,
            email: input.email ?? null,
            dateOfBirth: input.dateOfBirth ?? null,
            emergencyContactName: input.emergencyContactName ?? null,
            emergencyContactPhone: input.emergencyContactPhone ?? null,
            address: input.address ?? null,
            assignedTrainerId: input.assignedTrainerId ?? null,
            notes: input.notes ?? null,
          },
        });
        await writeAuditLog(transaction, {
          actorUserId: actor.id,
          action: "MEMBER_CREATED",
          entityType: "Member",
          entityId: created.id,
          after: {
            memberCode: created.memberCode,
            primaryBranchId: created.primaryBranchId,
            status: created.status,
          },
        });
        return created;
      });

      return { ok: true, memberId: member.id };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        return { ok: false, message: "Unable to create this member. Please try again." };
      }
    }
  }

  return { ok: false, message: "Unable to allocate a member code. Please try again." };
}

export async function updateMember(
  actor: CurrentUser,
  memberId: string,
  input: MemberInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasPermission(actor, "member.update")) {
    return { ok: false, message: "You do not have permission to update members." };
  }

  const existing = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: { id: true, primaryBranchId: true, firstName: true, lastName: true, status: true },
  });
  const branch = await getAccessibleBranch(actor, input.primaryBranchId);

  if (!existing || !branch) {
    return { ok: false, message: "Member or branch access was not found." };
  }

  if (!(await trainerIsEligible(input.assignedTrainerId, branch.id))) {
    return { ok: false, message: "Choose a trainer assigned to the selected branch." };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.member.update({
      where: { id: memberId },
      data: {
        primaryBranchId: branch.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        email: input.email ?? null,
        dateOfBirth: input.dateOfBirth ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        address: input.address ?? null,
        assignedTrainerId: input.assignedTrainerId ?? null,
        notes: input.notes ?? null,
      },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBER_UPDATED",
      entityType: "Member",
      entityId: memberId,
      before: {
        primaryBranchId: existing.primaryBranchId,
        fullName: `${existing.firstName} ${existing.lastName}`,
        status: existing.status,
      },
      after: {
        primaryBranchId: branch.id,
        fullName: `${input.firstName} ${input.lastName}`,
      },
    });
  });

  return { ok: true };
}

export async function changeMemberStatus(
  actor: CurrentUser,
  memberId: string,
  status: "ACTIVE" | "ARCHIVED",
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasPermission(actor, "member.archive")) {
    return { ok: false, message: "You do not have permission to archive members." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: { id: true, status: true },
  });

  if (!member) {
    return { ok: false, message: "Member access was not found." };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.member.update({ where: { id: member.id }, data: { status } });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: status === "ARCHIVED" ? "MEMBER_ARCHIVED" : "MEMBER_REACTIVATED",
      entityType: "Member",
      entityId: member.id,
      before: { status: member.status },
      after: { status },
    });
  });

  return { ok: true };
}

export async function updateMemberAvatar(
  actor: CurrentUser,
  memberId: string,
  avatarUrl: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasPermission(actor, "member.update")) {
    return { ok: false, message: "You do not have permission to update member profiles." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: { id: true, avatarUrl: true },
  });
  if (!member) {
    return { ok: false, message: "Member access was not found." };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.member.update({ where: { id: member.id }, data: { avatarUrl } });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBER_AVATAR_UPDATED",
      entityType: "Member",
      entityId: member.id,
      before: { hasAvatar: Boolean(member.avatarUrl) },
      after: { hasAvatar: true },
    });
  });

  return { ok: true };
}

export async function importMembers(
  actor: CurrentUser,
  input: { branchId: string; members: MemberInput[] },
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  if (!hasPermission(actor, "member.create")) {
    return { ok: false, message: "You do not have permission to create members." };
  }
  if (input.members.length === 0 || input.members.length > 200) {
    return { ok: false, message: "Import between 1 and 200 members at a time." };
  }

  const branch = await getAccessibleBranch(actor, input.branchId);
  if (!branch || input.members.some((member) => member.primaryBranchId !== branch.id)) {
    return { ok: false, message: "You cannot import members into that branch." };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await prisma.$transaction(async (transaction) => {
        for (const inputMember of input.members) {
          const created = await transaction.member.create({
            data: {
              gymId: branch.gymId,
              primaryBranchId: branch.id,
              memberCode: createMemberCode(),
              firstName: inputMember.firstName,
              lastName: inputMember.lastName,
              phone: inputMember.phone ?? null,
              email: inputMember.email ?? null,
              dateOfBirth: inputMember.dateOfBirth ?? null,
              emergencyContactName: inputMember.emergencyContactName ?? null,
              emergencyContactPhone: inputMember.emergencyContactPhone ?? null,
              address: inputMember.address ?? null,
              notes: inputMember.notes ?? null,
            },
          });
          await writeAuditLog(transaction, {
            actorUserId: actor.id,
            action: "MEMBER_IMPORTED",
            entityType: "Member",
            entityId: created.id,
            after: { memberCode: created.memberCode, primaryBranchId: branch.id },
          });
        }
      });

      return { ok: true, count: input.members.length };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        return { ok: false, message: "Unable to import these members. Please try again." };
      }
    }
  }

  return { ok: false, message: "Unable to allocate unique member codes. Please try again." };
}

export async function listMemberExportRows(actor: CurrentUser): Promise<MemberListItem[]> {
  if (!hasPermission(actor, "member.read")) {
    return [];
  }

  const members = await prisma.member.findMany({
    where: accessibleMemberWhere(actor),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      status: true,
      joinDate: true,
      primaryBranch: { select: { name: true } },
      assignedTrainer: { select: { name: true } },
    },
  });

  return members.map((member) => ({
    id: member.id,
    memberCode: member.memberCode,
    fullName: `${member.firstName} ${member.lastName}`,
    phone: member.phone,
    email: member.email,
    status: member.status as MemberStatus,
    joinDate: member.joinDate,
    branchName: member.primaryBranch.name,
    trainerName: member.assignedTrainer?.name ?? null,
  }));
}

export { MEMBER_STATUS_LABELS, PAGE_SIZE };
