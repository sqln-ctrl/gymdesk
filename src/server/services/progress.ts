import "server-only";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";
import type { ProgressEntryInput } from "@/lib/progress/schemas";
import type { StoredProgressPhoto } from "@/lib/storage/progress-photo";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

export type ProgressEntryListItem = {
  id: string;
  recordedAt: Date;
  recordedByName: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
  notes: string | null;
  photos: Array<{ id: string }>;
};

export type MemberProgress = {
  canManage: boolean;
  entries: ProgressEntryListItem[];
};

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function isTrainerRestricted(actor: CurrentUser): boolean {
  return actor.roleKeys.includes("TRAINER")
    && !actor.roleKeys.includes("BRANCH_ADMIN")
    && !hasOwnerAccess(actor);
}

function accessibleMemberWhere(actor: CurrentUser): Prisma.MemberWhereInput {
  return {
    gymId: { in: [...actor.gymIds] },
    ...(hasOwnerAccess(actor) ? {} : { primaryBranchId: { in: [...actor.branchIds] } }),
    ...(isTrainerRestricted(actor) ? { assignedTrainerId: actor.id } : {}),
  };
}

function canReadProgress(actor: CurrentUser): boolean {
  return hasPermission(actor, "progress.read") || hasPermission(actor, "progress.manage");
}

export async function getMemberProgress(actor: CurrentUser, memberId: string): Promise<MemberProgress | null> {
  if (!canReadProgress(actor)) return null;

  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: { id: true },
  });
  if (!member) return null;

  const entries = await prisma.progressEntry.findMany({
    where: { memberId: member.id },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      recordedAt: true,
      weightKg: true,
      bodyFatPercent: true,
      chestCm: true,
      waistCm: true,
      hipsCm: true,
      armsCm: true,
      thighsCm: true,
      notes: true,
      recordedBy: { select: { name: true } },
      photos: { select: { id: true } },
    },
  });

  return {
    canManage: hasPermission(actor, "progress.manage"),
    entries: entries.map((entry) => ({
      id: entry.id,
      recordedAt: entry.recordedAt,
      recordedByName: entry.recordedBy.name,
      weightKg: entry.weightKg,
      bodyFatPercent: entry.bodyFatPercent,
      chestCm: entry.chestCm,
      waistCm: entry.waistCm,
      hipsCm: entry.hipsCm,
      armsCm: entry.armsCm,
      thighsCm: entry.thighsCm,
      notes: entry.notes,
      photos: entry.photos,
    })),
  };
}

export async function createProgressEntry(
  actor: CurrentUser,
  memberId: string,
  input: ProgressEntryInput,
  photo?: StoredProgressPhoto,
): Promise<ServiceResult<{ progressEntryId: string }>> {
  if (!hasPermission(actor, "progress.manage")) {
    return { ok: false, message: "You do not have permission to record member progress." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: { id: true },
  });
  if (!member) {
    return { ok: false, message: "Member access was not found." };
  }

  try {
    const entry = await prisma.$transaction(async (transaction) => {
      const created = await transaction.progressEntry.create({
        data: {
          memberId: member.id,
          recordedById: actor.id,
          recordedAt: input.recordedAt,
          weightKg: input.weightKg ?? null,
          bodyFatPercent: input.bodyFatPercent ?? null,
          chestCm: input.chestCm ?? null,
          waistCm: input.waistCm ?? null,
          hipsCm: input.hipsCm ?? null,
          armsCm: input.armsCm ?? null,
          thighsCm: input.thighsCm ?? null,
          notes: input.notes ?? null,
          ...(photo ? {
            photos: {
              create: {
                storageKey: photo.storageKey,
                mimeType: photo.mimeType,
                sizeBytes: photo.sizeBytes,
              },
            },
          } : {}),
        },
        select: { id: true },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "MEMBER_PROGRESS_RECORDED",
        entityType: "ProgressEntry",
        entityId: created.id,
        after: {
          memberId: member.id,
          recordedAt: input.recordedAt.toISOString().slice(0, 10),
          measurements: {
            weightKg: input.weightKg ?? null,
            bodyFatPercent: input.bodyFatPercent ?? null,
            chestCm: input.chestCm ?? null,
            waistCm: input.waistCm ?? null,
            hipsCm: input.hipsCm ?? null,
            armsCm: input.armsCm ?? null,
            thighsCm: input.thighsCm ?? null,
          },
          hasPhoto: Boolean(photo),
        },
      });
      return created;
    });
    return { ok: true, data: { progressEntryId: entry.id } };
  } catch {
    return { ok: false, message: "Unable to record progress. Please try again." };
  }
}

export async function getProgressPhotoForAccess(
  actor: CurrentUser,
  photoId: string,
): Promise<{ storageKey: string; mimeType: string } | null> {
  if (!canReadProgress(actor)) return null;

  return prisma.progressPhoto.findFirst({
    where: {
      id: photoId,
      progressEntry: { member: accessibleMemberWhere(actor) },
    },
    select: { storageKey: true, mimeType: true },
  });
}
