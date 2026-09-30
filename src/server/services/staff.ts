import "server-only";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import { hashPassword } from "@/lib/auth/password";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY, type RoleKey } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";
import type { CreateStaffInput, UpdateStaffInput } from "@/lib/staff/schemas";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };
type EditableRoleKey = Exclude<RoleKey, "OWNER">;

export type StaffListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  roleKey: string | null;
  branches: string[];
  specialization: string | null;
};

export type StaffDetail = StaffListItem & {
  branchIds: string[];
  hireDate: Date | null;
  certifications: string | null;
  assignedMembers: Array<{ id: string; name: string; memberCode: string; status: string }>;
};

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function accessibleStaffWhere(actor: CurrentUser): Prisma.UserWhereInput {
  return {
    branchAssignments: {
      some: hasOwnerAccess(actor)
        ? { branch: { gymId: { in: [...actor.gymIds] } } }
        : { branchId: { in: [...actor.branchIds] } },
    },
  };
}

function allowedRole(actor: CurrentUser, roleKey: EditableRoleKey): boolean {
  return hasOwnerAccess(actor) || roleKey === "RECEPTIONIST" || roleKey === "TRAINER";
}

async function validateBranches(actor: CurrentUser, branchIds: string[]): Promise<boolean> {
  const ids = [...new Set(branchIds)];
  if (ids.length !== branchIds.length) return false;
  const branches = await prisma.branch.findMany({
    where: {
      id: { in: ids },
      gymId: { in: [...actor.gymIds] },
      isActive: true,
      ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
    },
    select: { id: true },
  });
  return branches.length === ids.length;
}

async function roleId(roleKey: EditableRoleKey): Promise<string | null> {
  const role = await prisma.role.findUnique({ where: { key: roleKey }, select: { id: true } });
  return role?.id ?? null;
}

export async function getStaffFormOptions(actor: CurrentUser) {
  if (!hasPermission(actor, "staff.manage")) return { branches: [], roles: [] as EditableRoleKey[] };
  const branches = await prisma.branch.findMany({
    where: {
      gymId: { in: [...actor.gymIds] },
      isActive: true,
      ...(hasOwnerAccess(actor) ? {} : { id: { in: [...actor.branchIds] } }),
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  return {
    branches: branches.map((branch) => ({ id: branch.id, label: `${branch.name} (${branch.code})` })),
    roles: (hasOwnerAccess(actor) ? ["BRANCH_ADMIN", "RECEPTIONIST", "TRAINER"] : ["RECEPTIONIST", "TRAINER"]) as EditableRoleKey[],
  };
}

export async function listStaff(actor: CurrentUser): Promise<StaffListItem[]> {
  if (!hasPermission(actor, "staff.manage")) return [];
  const staff = await prisma.user.findMany({
    where: accessibleStaffWhere(actor),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      roles: { select: { role: { select: { key: true } } } },
      branchAssignments: { select: { branchId: true, branch: { select: { name: true } } } },
      staffProfile: { select: { specialization: true } },
    },
  });
  return staff.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    phone: person.phone,
    status: person.status,
    roleKey: person.roles[0]?.role.key ?? null,
    branches: person.branchAssignments.map((assignment) => assignment.branch.name),
    specialization: person.staffProfile?.specialization ?? null,
  }));
}

export async function getStaffDetail(actor: CurrentUser, staffId: string): Promise<StaffDetail | null> {
  if (!hasPermission(actor, "staff.manage")) return null;
  const person = await prisma.user.findFirst({
    where: { id: staffId, ...accessibleStaffWhere(actor) },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      roles: { select: { role: { select: { key: true } } } },
      branchAssignments: { select: { branchId: true, branch: { select: { name: true } } } },
      staffProfile: { select: { hireDate: true, specialization: true, certifications: true } },
      assignedMembers: {
        where: hasOwnerAccess(actor) ? { gymId: { in: [...actor.gymIds] } } : { primaryBranchId: { in: [...actor.branchIds] } },
        select: { id: true, firstName: true, lastName: true, memberCode: true, status: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
  });
  if (!person) return null;
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    phone: person.phone,
    status: person.status,
    roleKey: person.roles[0]?.role.key ?? null,
    branches: person.branchAssignments.map((assignment) => assignment.branch.name),
    branchIds: person.branchAssignments.map((assignment) => assignment.branchId),
    hireDate: person.staffProfile?.hireDate ?? null,
    specialization: person.staffProfile?.specialization ?? null,
    certifications: person.staffProfile?.certifications ?? null,
    assignedMembers: person.assignedMembers.map((member) => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      memberCode: member.memberCode,
      status: member.status,
    })),
  };
}

export async function createStaff(actor: CurrentUser, input: CreateStaffInput): Promise<ServiceResult<{ staffId: string }>> {
  if (!hasPermission(actor, "staff.manage") || !allowedRole(actor, input.roleKey)) {
    return { ok: false, message: "You do not have permission to assign that staff role." };
  }
  if (!(await validateBranches(actor, input.branchIds))) {
    return { ok: false, message: "Select one or more active branches you can manage." };
  }
  const assignedRoleId = await roleId(input.roleKey);
  if (!assignedRoleId) return { ok: false, message: "The selected role is unavailable. Seed authorization first." };

  try {
    const passwordHash = await hashPassword(input.password);
    const person = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          passwordHash,
          roles: { create: { roleId: assignedRoleId } },
          branchAssignments: { create: input.branchIds.map((branchId) => ({ branchId })) },
          staffProfile: {
            create: {
              hireDate: input.hireDate ?? null,
              specialization: input.specialization ?? null,
              certifications: input.certifications ?? null,
            },
          },
        },
        select: { id: true },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "STAFF_CREATED",
        entityType: "User",
        entityId: created.id,
        after: { roleKey: input.roleKey, branchIds: input.branchIds, specialization: input.specialization ?? null },
      });
      return created;
    });
    return { ok: true, data: { staffId: person.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A user with that email address already exists." };
    }
    return { ok: false, message: "Unable to create this staff account. Please try again." };
  }
}

export async function updateStaff(actor: CurrentUser, staffId: string, input: UpdateStaffInput): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "staff.manage") || !allowedRole(actor, input.roleKey)) {
    return { ok: false, message: "You do not have permission to assign that staff role." };
  }
  if (actor.id === staffId) return { ok: false, message: "Use a different administrator to change your own role or branch access." };
  if (!(await validateBranches(actor, input.branchIds))) {
    return { ok: false, message: "Select one or more active branches you can manage." };
  }
  const [existing, assignedRoleId] = await Promise.all([
    prisma.user.findFirst({
      where: { id: staffId, ...accessibleStaffWhere(actor) },
      select: { id: true, email: true, name: true, phone: true, roles: { select: { role: { select: { key: true } } } }, branchAssignments: { select: { branchId: true } }, staffProfile: { select: { hireDate: true, specialization: true, certifications: true } } },
    }),
    roleId(input.roleKey),
  ]);
  if (!existing || !assignedRoleId) return { ok: false, message: "Staff access or selected role was not found." };
  if (existing.roles.some((role) => role.role.key === OWNER_ROLE_KEY)) return { ok: false, message: "Owner accounts cannot be edited from staff management." };

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: staffId },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          roles: { deleteMany: {}, create: { roleId: assignedRoleId } },
          branchAssignments: { deleteMany: {}, create: input.branchIds.map((branchId) => ({ branchId })) },
          staffProfile: {
            upsert: {
              create: { hireDate: input.hireDate ?? null, specialization: input.specialization ?? null, certifications: input.certifications ?? null },
              update: { hireDate: input.hireDate ?? null, specialization: input.specialization ?? null, certifications: input.certifications ?? null },
            },
          },
        },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "STAFF_UPDATED",
        entityType: "User",
        entityId: staffId,
        before: {
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          roleKeys: existing.roles.map((role) => role.role.key),
          branchIds: existing.branchAssignments.map((assignment) => assignment.branchId),
          profile: existing.staffProfile,
        },
        after: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          roleKey: input.roleKey,
          branchIds: input.branchIds,
          hireDate: input.hireDate ?? null,
          specialization: input.specialization ?? null,
          certifications: input.certifications ?? null,
        },
      });
    });
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A user with that email address already exists." };
    }
    return { ok: false, message: "Unable to update this staff account. Please try again." };
  }
}

export async function setStaffStatus(actor: CurrentUser, staffId: string, status: "ACTIVE" | "INACTIVE"): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "staff.manage")) return { ok: false, message: "You do not have permission to update staff status." };
  if (actor.id === staffId) return { ok: false, message: "You cannot deactivate your own account." };
  const existing = await prisma.user.findFirst({
    where: { id: staffId, ...accessibleStaffWhere(actor) },
    select: { id: true, status: true, roles: { select: { role: { select: { key: true } } } } },
  });
  if (!existing || existing.roles.some((role) => role.role.key === OWNER_ROLE_KEY)) {
    return { ok: false, message: "Staff access was not found or this account is protected." };
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: staffId }, data: { status } });
    if (status === "INACTIVE") {
      await transaction.userSession.deleteMany({ where: { userId: staffId } });
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: status === "ACTIVE" ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
      entityType: "User",
      entityId: staffId,
      before: { status: existing.status },
      after: { status },
    });
  });
  return { ok: true, data: undefined };
}
