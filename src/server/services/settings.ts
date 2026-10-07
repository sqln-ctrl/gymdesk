import "server-only";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions/policy";
import type { BranchSettingsInput, GymSettingsInput } from "@/lib/settings/schemas";

type Result = { ok: true } | { ok: false; message: string };

export type SettingsDetail = {
  gym: { id: string; name: string; logoUrl: string | null; currency: string; timezone: string };
  branches: Array<{ id: string; code: string; name: string; phone: string | null; email: string | null; address: string | null; isActive: boolean }>;
};

export async function getSettings(actor: CurrentUser): Promise<SettingsDetail | null> {
  if (!hasPermission(actor, "settings.manage")) return null;
  const gym = await prisma.gym.findFirst({
    where: { id: { in: [...actor.gymIds] } },
    select: { id: true, name: true, logoUrl: true, currency: true, timezone: true, branches: { select: { id: true, code: true, name: true, phone: true, email: true, address: true, isActive: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return gym ? { gym: { id: gym.id, name: gym.name, logoUrl: gym.logoUrl, currency: gym.currency, timezone: gym.timezone }, branches: gym.branches } : null;
}

export async function updateGymSettings(actor: CurrentUser, input: GymSettingsInput): Promise<Result> {
  if (!hasPermission(actor, "settings.manage") || !actor.gymIds.includes(input.gymId)) return { ok: false, message: "You do not have permission to update these settings." };
  const existing = await prisma.gym.findFirst({ where: { id: input.gymId }, select: { id: true, name: true, logoUrl: true, currency: true, timezone: true } });
  if (!existing) return { ok: false, message: "Gym settings were not found." };
  await prisma.$transaction(async (transaction) => {
    await transaction.gym.update({ where: { id: existing.id }, data: { name: input.name, logoUrl: input.logoUrl ?? null, currency: input.currency, timezone: input.timezone } });
    await writeAuditLog(transaction, { actorUserId: actor.id, action: "GYM_SETTINGS_UPDATED", entityType: "Gym", entityId: existing.id, before: { name: existing.name, logoUrl: existing.logoUrl, currency: existing.currency, timezone: existing.timezone }, after: { name: input.name, logoUrl: input.logoUrl ?? null, currency: input.currency, timezone: input.timezone } });
  });
  return { ok: true };
}

export async function updateBranchSettings(actor: CurrentUser, input: BranchSettingsInput): Promise<Result> {
  if (!hasPermission(actor, "settings.manage")) return { ok: false, message: "You do not have permission to update branch settings." };
  const existing = await prisma.branch.findFirst({ where: { id: input.branchId, gymId: { in: [...actor.gymIds] } }, select: { id: true, name: true, phone: true, email: true, address: true } });
  if (!existing) return { ok: false, message: "Branch settings were not found." };
  await prisma.$transaction(async (transaction) => {
    await transaction.branch.update({ where: { id: existing.id }, data: { name: input.name, phone: input.phone ?? null, email: input.email ?? null, address: input.address ?? null } });
    await writeAuditLog(transaction, { actorUserId: actor.id, action: "BRANCH_SETTINGS_UPDATED", entityType: "Branch", entityId: existing.id, before: existing, after: { name: input.name, phone: input.phone ?? null, email: input.email ?? null, address: input.address ?? null } });
  });
  return { ok: true };
}
