import "server-only";

import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";
import type { EquipmentInput, MaintenanceInput } from "@/lib/equipment/schemas";

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
function owner(actor: CurrentUser) { return actor.roleKeys.includes(OWNER_ROLE_KEY); }
function branches(actor: CurrentUser): Prisma.BranchWhereInput { return { gymId: { in: [...actor.gymIds] }, ...(owner(actor) ? {} : { id: { in: [...actor.branchIds] } }) }; }
const canRead = (actor: CurrentUser) => hasPermission(actor, "equipment.read") || hasPermission(actor, "equipment.manage");

export async function getEquipmentOptions(actor: CurrentUser) { if (!hasPermission(actor, "equipment.manage")) return []; return prisma.branch.findMany({ where: { ...branches(actor), isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }); }
export async function listEquipment(actor: CurrentUser) {
  if (!canRead(actor)) return [];
  return prisma.equipment.findMany({ where: { branch: branches(actor) }, orderBy: [{ nextServiceAt: "asc" }, { name: "asc" }], select: { id: true, assetCode: true, name: true, category: true, location: true, status: true, nextServiceAt: true, branch: { select: { name: true } }, maintenance: { orderBy: { servicedAt: "desc" }, take: 1, select: { servicedAt: true, serviceType: true, costMinor: true } } } });
}
export async function getMaintenanceCostSummary(actor: CurrentUser) {
  if (!canRead(actor)) return { totalMinor: 0, records: [] as Array<{ id: string; equipmentName: string; serviceType: string; costMinor: number; servicedAt: Date }> };
  const records = await prisma.maintenanceRecord.findMany({ where: { equipment: { branch: branches(actor) } }, orderBy: { servicedAt: "desc" }, take: 50, select: { id: true, servicedAt: true, serviceType: true, costMinor: true, equipment: { select: { name: true } } } });
  return { totalMinor: records.reduce((total, record) => total + record.costMinor, 0), records: records.map((record) => ({ id: record.id, equipmentName: record.equipment.name, serviceType: record.serviceType, costMinor: record.costMinor, servicedAt: record.servicedAt })) };
}
export async function createEquipment(actor: CurrentUser, input: EquipmentInput): Promise<Result<undefined>> {
  if (!hasPermission(actor, "equipment.manage")) return { ok: false, message: "You do not have permission to manage equipment." };
  const branch = await prisma.branch.findFirst({ where: { id: input.branchId, ...branches(actor) }, select: { id: true } }); if (!branch) return { ok: false, message: "Choose an accessible branch." };
  try { await prisma.$transaction(async (tx) => { const equipment = await tx.equipment.create({ data: { ...input, category: input.category ?? null, location: input.location ?? null, purchaseDate: input.purchaseDate ?? null, warrantyEndsAt: input.warrantyEndsAt ?? null, nextServiceAt: input.nextServiceAt ?? null } }); await writeAuditLog(tx, { actorUserId: actor.id, action: "EQUIPMENT_CREATED", entityType: "Equipment", entityId: equipment.id, after: { branchId: input.branchId, assetCode: input.assetCode } }); }); return { ok: true, data: undefined }; } catch (error) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? { ok: false, message: "This asset code already exists at the branch." } : { ok: false, message: "Unable to create equipment." }; }
}
export async function recordMaintenance(actor: CurrentUser, input: MaintenanceInput): Promise<Result<undefined>> {
  if (!hasPermission(actor, "equipment.manage")) return { ok: false, message: "You do not have permission to manage maintenance." };
  const equipment = await prisma.equipment.findFirst({ where: { id: input.equipmentId, branch: branches(actor) }, select: { id: true } }); if (!equipment) return { ok: false, message: "Equipment access was not found." };
  await prisma.$transaction(async (tx) => { const record = await tx.maintenanceRecord.create({ data: { ...input, vendor: input.vendor ?? null, notes: input.notes ?? null, nextDueAt: input.nextDueAt ?? null } }); await tx.equipment.update({ where: { id: equipment.id }, data: { lastServiceAt: input.servicedAt, nextServiceAt: input.nextDueAt ?? null } }); await writeAuditLog(tx, { actorUserId: actor.id, action: "MAINTENANCE_RECORDED", entityType: "MaintenanceRecord", entityId: record.id, after: { equipmentId: equipment.id, costMinor: input.costMinor } }); }); return { ok: true, data: undefined };
}
