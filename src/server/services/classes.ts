import "server-only";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";
import type { FitnessClassInput } from "@/lib/classes/schemas";

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

export type ClassScheduleItem = {
  id: string; branchId: string; startsAt: Date; endsAt: Date; capacity: number; bookedCount: number; waitlistCount: number; status: string;
  className: string; room: string | null; branchName: string; trainerName: string | null;
  bookings: Array<{ id: string; memberName: string; memberCode: string; status: string }>;
  waitlist: Array<{ id: string; memberName: string; memberCode: string; position: number }>;
};

function isOwner(actor: CurrentUser) { return actor.roleKeys.includes(OWNER_ROLE_KEY); }
function branchWhere(actor: CurrentUser): Prisma.BranchWhereInput { return { gymId: { in: [...actor.gymIds] }, ...(isOwner(actor) ? {} : { id: { in: [...actor.branchIds] } }) }; }
function memberWhere(actor: CurrentUser): Prisma.MemberWhereInput { return { gymId: { in: [...actor.gymIds] }, ...(isOwner(actor) ? {} : { primaryBranchId: { in: [...actor.branchIds] } }) }; }
function canManage(actor: CurrentUser) { return hasPermission(actor, "class.manage"); }
function canBook(actor: CurrentUser) { return canManage(actor) || hasPermission(actor, "class.book"); }

export async function getClassFormOptions(actor: CurrentUser) {
  if (!canManage(actor)) return { branches: [], trainers: [] };
  const [branches, trainers] = await Promise.all([
    prisma.branch.findMany({ where: { ...branchWhere(actor), isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { status: "ACTIVE", roles: { some: { role: { key: "TRAINER" } } }, branchAssignments: { some: isOwner(actor) ? { branch: { gymId: { in: [...actor.gymIds] } } } : { branchId: { in: [...actor.branchIds] } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { branches: branches.map((branch) => ({ id: branch.id, label: `${branch.name} (${branch.code})` })), trainers };
}

export async function listSchedule(actor: CurrentUser): Promise<ClassScheduleItem[]> {
  if (!hasPermission(actor, "class.read") && !canManage(actor) && !hasPermission(actor, "class.book")) return [];
  const sessions = await prisma.classSession.findMany({
    where: { branch: branchWhere(actor), startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    orderBy: { startsAt: "asc" }, take: 100,
    select: { id: true, branchId: true, startsAt: true, endsAt: true, capacity: true, bookedCount: true, waitlistCount: true, status: true, fitnessClass: { select: { name: true, room: true, trainer: { select: { name: true } } } }, branch: { select: { name: true } }, bookings: { where: { status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } }, select: { id: true, status: true, member: { select: { firstName: true, lastName: true, memberCode: true } } }, orderBy: { bookedAt: "asc" } }, waitlist: { select: { id: true, position: true, member: { select: { firstName: true, lastName: true, memberCode: true } } }, orderBy: { position: "asc" } } },
  });
  return sessions.map((session) => ({ id: session.id, branchId: session.branchId, startsAt: session.startsAt, endsAt: session.endsAt, capacity: session.capacity, bookedCount: session.bookedCount, waitlistCount: session.waitlistCount, status: session.status, className: session.fitnessClass.name, room: session.fitnessClass.room, branchName: session.branch.name, trainerName: session.fitnessClass.trainer?.name ?? null, bookings: session.bookings.map((booking) => ({ id: booking.id, status: booking.status, memberName: `${booking.member.firstName} ${booking.member.lastName}`, memberCode: booking.member.memberCode })), waitlist: session.waitlist.map((entry) => ({ id: entry.id, position: entry.position, memberName: `${entry.member.firstName} ${entry.member.lastName}`, memberCode: entry.member.memberCode })) }));
}

export async function listBookableMembers(actor: CurrentUser) {
  if (!canBook(actor)) return [];
  return prisma.member.findMany({ where: { ...memberWhere(actor), status: "ACTIVE" }, select: { id: true, primaryBranchId: true, firstName: true, lastName: true, memberCode: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 200 });
}

export async function createFitnessClass(actor: CurrentUser, input: FitnessClassInput): Promise<Result<{ classId: string; sessionCount: number }>> {
  if (!canManage(actor)) return { ok: false, message: "You do not have permission to manage classes." };
  const branch = await prisma.branch.findFirst({ where: { id: input.branchId, ...branchWhere(actor), isActive: true }, select: { id: true } });
  if (!branch) return { ok: false, message: "Choose an active branch you can manage." };
  if (input.trainerId) {
    const trainer = await prisma.user.findFirst({ where: { id: input.trainerId, status: "ACTIVE", roles: { some: { role: { key: "TRAINER" } } }, branchAssignments: { some: { branchId: branch.id } } }, select: { id: true } });
    if (!trainer) return { ok: false, message: "Choose a trainer assigned to this branch." };
  }
  try {
    const created = await prisma.$transaction(async (tx) => {
      const fitnessClass = await tx.fitnessClass.create({ data: { branchId: branch.id, trainerId: input.trainerId ?? null, name: input.name, description: input.description ?? null, room: input.room ?? null, defaultCapacity: input.defaultCapacity, defaultDurationMinutes: input.defaultDurationMinutes }, select: { id: true } });
      const sessions = Array.from({ length: input.occurrences }, (_, index) => {
        const startsAt = new Date(input.firstSessionAt.getTime() + index * input.repeatEveryDays * 86_400_000);
        return { fitnessClassId: fitnessClass.id, branchId: branch.id, startsAt, endsAt: new Date(startsAt.getTime() + input.defaultDurationMinutes * 60_000), capacity: input.defaultCapacity };
      });
      await tx.classSession.createMany({ data: sessions });
      await writeAuditLog(tx, { actorUserId: actor.id, action: "CLASS_CREATED", entityType: "FitnessClass", entityId: fitnessClass.id, after: { branchId: branch.id, name: input.name, sessionCount: sessions.length } });
      return fitnessClass;
    });
    return { ok: true, data: { classId: created.id, sessionCount: input.occurrences } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "A class with that name already exists at this branch." };
    return { ok: false, message: "Unable to create the class." };
  }
}

export async function bookMemberIntoClass(actor: CurrentUser, sessionId: string, memberId: string): Promise<Result<{ status: "BOOKED" | "WAITLISTED" }>> {
  if (!canBook(actor)) return { ok: false, message: "You do not have permission to book classes." };
  const [session, member] = await Promise.all([
    prisma.classSession.findFirst({ where: { id: sessionId, branch: branchWhere(actor), status: "SCHEDULED", startsAt: { gt: new Date() } }, select: { id: true, branchId: true } }),
    prisma.member.findFirst({ where: { id: memberId, ...memberWhere(actor), status: "ACTIVE" }, select: { id: true, primaryBranchId: true } }),
  ]);
  if (!session || !member || member.primaryBranchId !== session.branchId) return { ok: false, message: "Member or class session access was not found." };
  try {
    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.classBooking.findUnique({ where: { sessionId_memberId: { sessionId, memberId } }, select: { status: true } });
      if (duplicate && duplicate.status !== "CANCELLED") return { ok: false, message: "This member already has a place in the class." };
      const seatReserved = await tx.$executeRaw(Prisma.sql`UPDATE "ClassSession" SET "bookedCount" = "bookedCount" + 1 WHERE "id" = ${sessionId} AND "status" = 'SCHEDULED' AND "bookedCount" < "capacity"`);
      if (seatReserved === 1) {
        await tx.classBooking.upsert({ where: { sessionId_memberId: { sessionId, memberId } }, create: { sessionId, memberId }, update: { status: "BOOKED", bookedAt: new Date(), cancelledAt: null } });
        const waitlistEntry = await tx.classWaitlistEntry.findUnique({ where: { sessionId_memberId: { sessionId, memberId } }, select: { id: true } });
        if (waitlistEntry) {
          await tx.classWaitlistEntry.delete({ where: { id: waitlistEntry.id } });
          await tx.classSession.update({ where: { id: sessionId }, data: { waitlistCount: { decrement: 1 } } });
        }
        return { ok: true, data: { status: "BOOKED" } };
      }
      const existingWait = await tx.classWaitlistEntry.findUnique({ where: { sessionId_memberId: { sessionId, memberId } }, select: { id: true } });
      if (existingWait) return { ok: false, message: "This member is already on the waitlist." };
      const updated = await tx.classSession.update({ where: { id: sessionId }, data: { waitlistCount: { increment: 1 } }, select: { waitlistCount: true } });
      await tx.classWaitlistEntry.create({ data: { sessionId, memberId, position: updated.waitlistCount } });
      return { ok: true, data: { status: "WAITLISTED" } };
    });
  } catch { return { ok: false, message: "Unable to reserve a class place. Please try again." }; }
}

export async function cancelClassBooking(actor: CurrentUser, bookingId: string): Promise<Result<undefined>> {
  if (!canBook(actor)) return { ok: false, message: "You do not have permission to cancel class bookings." };
  const booking = await prisma.classBooking.findFirst({ where: { id: bookingId, session: { branch: branchWhere(actor) } }, select: { id: true, memberId: true, status: true, sessionId: true, session: { select: { startsAt: true, status: true } } } });
  if (!booking || booking.status === "CANCELLED" || booking.session.status !== "SCHEDULED" || booking.session.startsAt <= new Date()) return { ok: false, message: "This booking can no longer be cancelled." };
  await prisma.$transaction(async (tx) => {
    await tx.classBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    const next = await tx.classWaitlistEntry.findFirst({ where: { sessionId: booking.sessionId }, orderBy: { position: "asc" }, select: { id: true, memberId: true } });
    if (next) {
      await tx.classWaitlistEntry.delete({ where: { id: next.id } });
      await tx.classSession.update({ where: { id: booking.sessionId }, data: { waitlistCount: { decrement: 1 } } });
      await tx.classBooking.upsert({ where: { sessionId_memberId: { sessionId: booking.sessionId, memberId: next.memberId } }, create: { sessionId: booking.sessionId, memberId: next.memberId }, update: { status: "BOOKED", bookedAt: new Date(), cancelledAt: null } });
    } else {
      await tx.classSession.update({ where: { id: booking.sessionId }, data: { bookedCount: { decrement: 1 } } });
    }
    await writeAuditLog(tx, { actorUserId: actor.id, action: "CLASS_BOOKING_CANCELLED", entityType: "ClassBooking", entityId: booking.id, after: { sessionId: booking.sessionId, promotedMemberId: next?.memberId ?? null } });
  });
  return { ok: true, data: undefined };
}

export async function recordClassAttendance(actor: CurrentUser, bookingId: string, status: "ATTENDED" | "NO_SHOW"): Promise<Result<undefined>> {
  if (!canManage(actor)) return { ok: false, message: "You do not have permission to mark class attendance." };
  const booking = await prisma.classBooking.findFirst({ where: { id: bookingId, session: { branch: branchWhere(actor) }, status: "BOOKED" }, select: { id: true, sessionId: true } });
  if (!booking) return { ok: false, message: "An active class booking was not found." };
  await prisma.$transaction(async (tx) => {
    await tx.classBooking.update({ where: { id: booking.id }, data: { status } });
    await writeAuditLog(tx, { actorUserId: actor.id, action: "CLASS_ATTENDANCE_RECORDED", entityType: "ClassBooking", entityId: booking.id, after: { sessionId: booking.sessionId, status } });
  });
  return { ok: true, data: undefined };
}
