import "server-only";

import { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";
import type { ExerciseInput, MemberWorkoutPlanInput, WorkoutTemplateInput } from "@/lib/workouts/schemas";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

export type ExerciseListItem = {
  id: string;
  gymId: string;
  name: string;
  category: string | null;
  equipment: string | null;
  instructions: string | null;
  mediaUrl: string | null;
  isActive: boolean;
};

export type WorkoutTemplateListItem = {
  id: string;
  gymId: string;
  name: string;
  description: string | null;
  createdByName: string;
  dayCount: number;
};

export type WorkoutTemplateDetail = {
  id: string;
  gymId: string;
  name: string;
  description: string | null;
  createdById: string;
  days: Array<{
    id: string;
    title: string;
    notes: string | null;
    exercises: Array<{
      id: string;
      exerciseId: string;
      exerciseName: string;
      sets: number | null;
      reps: string | null;
      weightKg: number | null;
      restSeconds: number | null;
      durationSeconds: number | null;
      notes: string | null;
    }>;
  }>;
};

export type MemberWorkoutPlanListItem = {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date;
  endDate: Date | null;
  status: string;
  trainerName: string;
  templateName: string | null;
  days: Array<{
    id: string;
    title: string;
    notes: string | null;
    exercises: Array<{
      id: string;
      exerciseName: string;
      sets: number | null;
      reps: string | null;
      weightKg: number | null;
      restSeconds: number | null;
      durationSeconds: number | null;
      notes: string | null;
    }>;
  }>;
};

function workoutGymWhere(actor: CurrentUser): Prisma.ExerciseWhereInput {
  return { gymId: { in: [...actor.gymIds] } };
}

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

function toTemplateDetail(template: {
  id: string;
  gymId: string;
  name: string;
  description: string | null;
  createdById: string;
  days: Array<{
    id: string;
    title: string;
    notes: string | null;
    exercises: Array<{
      id: string;
      exerciseId: string;
      sets: number | null;
      reps: string | null;
      weightKg: number | null;
      restSeconds: number | null;
      durationSeconds: number | null;
      notes: string | null;
      exercise: { name: string };
    }>;
  }>;
}): WorkoutTemplateDetail {
  return {
    id: template.id,
    gymId: template.gymId,
    name: template.name,
    description: template.description,
    createdById: template.createdById,
    days: template.days.map((day) => ({
      id: day.id,
      title: day.title,
      notes: day.notes,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: exercise.weightKg,
        restSeconds: exercise.restSeconds,
        durationSeconds: exercise.durationSeconds,
        notes: exercise.notes,
      })),
    })),
  };
}

export async function getWorkoutGymOptions(actor: CurrentUser): Promise<Array<{ id: string; name: string }>> {
  if (!hasPermission(actor, "workout.manage")) return [];
  return prisma.gym.findMany({
    where: { id: { in: [...actor.gymIds] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listExercises(actor: CurrentUser): Promise<ExerciseListItem[]> {
  if (!hasPermission(actor, "workout.read") && !hasPermission(actor, "workout.manage")) return [];
  return prisma.exercise.findMany({
    where: workoutGymWhere(actor),
    select: { id: true, gymId: true, name: true, category: true, equipment: true, instructions: true, mediaUrl: true, isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function createExercise(actor: CurrentUser, input: ExerciseInput): Promise<ServiceResult<{ exerciseId: string }>> {
  if (!hasPermission(actor, "workout.manage") || !actor.gymIds.includes(input.gymId)) {
    return { ok: false, message: "You do not have permission to manage exercises for this gym." };
  }
  try {
    const exercise = await prisma.$transaction(async (transaction) => {
      const created = await transaction.exercise.create({ data: input, select: { id: true } });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "EXERCISE_CREATED",
        entityType: "Exercise",
        entityId: created.id,
        after: { gymId: input.gymId, name: input.name, category: input.category ?? null },
      });
      return created;
    });
    return { ok: true, data: { exerciseId: exercise.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "An exercise with that name already exists in this gym." };
    }
    return { ok: false, message: "Unable to create the exercise. Please try again." };
  }
}

export async function setExerciseActive(actor: CurrentUser, exerciseId: string, isActive: boolean): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "workout.manage")) return { ok: false, message: "You do not have permission to manage exercises." };
  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, ...workoutGymWhere(actor) }, select: { id: true, isActive: true } });
  if (!exercise) return { ok: false, message: "Exercise access was not found." };
  await prisma.$transaction(async (transaction) => {
    await transaction.exercise.update({ where: { id: exercise.id }, data: { isActive } });
    await writeAuditLog(transaction, { actorUserId: actor.id, action: isActive ? "EXERCISE_REACTIVATED" : "EXERCISE_DEACTIVATED", entityType: "Exercise", entityId: exercise.id, before: { isActive: exercise.isActive }, after: { isActive } });
  });
  return { ok: true, data: undefined };
}

async function exercisesMatchTemplate(
  transaction: Prisma.TransactionClient,
  gymId: string,
  input: WorkoutTemplateInput,
): Promise<boolean> {
  const exerciseIds = [...new Set(input.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)))];
  const count = await transaction.exercise.count({
    where: { id: { in: exerciseIds }, gymId, isActive: true },
  });
  return count === exerciseIds.length;
}

function templateDaysData(input: WorkoutTemplateInput) {
  return input.days.map((day, dayIndex) => ({
    dayNumber: dayIndex + 1,
    title: day.title,
    notes: day.notes ?? null,
    exercises: {
      create: day.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: exercise.exerciseId,
        position: exerciseIndex + 1,
        sets: exercise.sets ?? null,
        reps: exercise.reps ?? null,
        weightKg: exercise.weightKg ?? null,
        restSeconds: exercise.restSeconds ?? null,
        durationSeconds: exercise.durationSeconds ?? null,
        notes: exercise.notes ?? null,
      })),
    },
  }));
}

export async function listWorkoutTemplates(actor: CurrentUser): Promise<WorkoutTemplateListItem[]> {
  if (!hasPermission(actor, "workout.read") && !hasPermission(actor, "workout.manage")) return [];
  const templates = await prisma.workoutTemplate.findMany({
    where: { gymId: { in: [...actor.gymIds] } },
    select: {
      id: true,
      gymId: true,
      name: true,
      description: true,
      createdBy: { select: { name: true } },
      _count: { select: { days: true } },
    },
    orderBy: { name: "asc" },
  });
  return templates.map((template) => ({
    id: template.id,
    gymId: template.gymId,
    name: template.name,
    description: template.description,
    createdByName: template.createdBy.name,
    dayCount: template._count.days,
  }));
}

export async function getWorkoutTemplate(actor: CurrentUser, templateId: string): Promise<WorkoutTemplateDetail | null> {
  if (!hasPermission(actor, "workout.read") && !hasPermission(actor, "workout.manage")) return null;
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, gymId: { in: [...actor.gymIds] } },
    select: {
      id: true,
      gymId: true,
      name: true,
      description: true,
      createdById: true,
      days: {
        orderBy: { dayNumber: "asc" },
        select: {
          id: true,
          title: true,
          notes: true,
          exercises: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              exerciseId: true,
              sets: true,
              reps: true,
              weightKg: true,
              restSeconds: true,
              durationSeconds: true,
              notes: true,
              exercise: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  return template ? toTemplateDetail(template) : null;
}

export async function createWorkoutTemplate(actor: CurrentUser, input: WorkoutTemplateInput): Promise<ServiceResult<{ templateId: string }>> {
  if (!hasPermission(actor, "workout.manage") || !actor.gymIds.includes(input.gymId)) {
    return { ok: false, message: "You do not have permission to create workout templates for this gym." };
  }
  try {
    const template = await prisma.$transaction(async (transaction) => {
      if (!(await exercisesMatchTemplate(transaction, input.gymId, input))) {
        throw new Error("Choose active exercises from the selected gym.");
      }
      const created = await transaction.workoutTemplate.create({
        data: {
          gymId: input.gymId,
          name: input.name,
          description: input.description ?? null,
          createdById: actor.id,
          days: { create: templateDaysData(input) },
        },
        select: { id: true },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "WORKOUT_TEMPLATE_CREATED",
        entityType: "WorkoutTemplate",
        entityId: created.id,
        after: { gymId: input.gymId, name: input.name, dayCount: input.days.length },
      });
      return created;
    });
    return { ok: true, data: { templateId: template.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A template with that name already exists in this gym." };
    }
    return { ok: false, message: error instanceof Error ? error.message : "Unable to create the workout template." };
  }
}

export async function updateWorkoutTemplate(actor: CurrentUser, templateId: string, input: WorkoutTemplateInput): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "workout.manage") || !actor.gymIds.includes(input.gymId)) {
    return { ok: false, message: "You do not have permission to update this workout template." };
  }
  const existing = await prisma.workoutTemplate.findFirst({
    where: {
      id: templateId,
      gymId: input.gymId,
      ...(isTrainerRestricted(actor) ? { createdById: actor.id } : {}),
    },
    select: { id: true, name: true, description: true, gymId: true },
  });
  if (!existing) return { ok: false, message: "Template access was not found, or only its creator can edit it." };
  try {
    await prisma.$transaction(async (transaction) => {
      if (!(await exercisesMatchTemplate(transaction, input.gymId, input))) {
        throw new Error("Choose active exercises from the selected gym.");
      }
      await transaction.workoutTemplate.update({
        where: { id: templateId },
        data: {
          name: input.name,
          description: input.description ?? null,
          days: { deleteMany: {}, create: templateDaysData(input) },
        },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "WORKOUT_TEMPLATE_UPDATED",
        entityType: "WorkoutTemplate",
        entityId: templateId,
        before: { name: existing.name, description: existing.description },
        after: { name: input.name, description: input.description ?? null, dayCount: input.days.length },
      });
    });
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "A template with that name already exists in this gym." };
    }
    return { ok: false, message: error instanceof Error ? error.message : "Unable to update the workout template." };
  }
}

export async function createMemberWorkoutPlan(actor: CurrentUser, input: MemberWorkoutPlanInput): Promise<ServiceResult<{ planId: string }>> {
  if (!hasPermission(actor, "workout.manage")) return { ok: false, message: "You do not have permission to create member workout plans." };
  const [member, template] = await Promise.all([
    prisma.member.findFirst({ where: { id: input.memberId, ...accessibleMemberWhere(actor) }, select: { id: true, gymId: true, assignedTrainerId: true } }),
    prisma.workoutTemplate.findFirst({
      where: { id: input.templateId, gymId: { in: [...actor.gymIds] } },
      select: {
        id: true,
        gymId: true,
        days: {
          orderBy: { dayNumber: "asc" },
          select: {
            dayNumber: true,
            title: true,
            notes: true,
            exercises: {
              orderBy: { position: "asc" },
              select: { exerciseId: true, position: true, sets: true, reps: true, weightKg: true, restSeconds: true, durationSeconds: true, notes: true },
            },
          },
        },
      },
    }),
  ]);
  if (!member || !template || member.gymId !== template.gymId) return { ok: false, message: "Member or template access was not found." };
  if (isTrainerRestricted(actor) && member.assignedTrainerId !== actor.id) return { ok: false, message: "Trainers can create plans only for their assigned members." };

  const plan = await prisma.$transaction(async (transaction) => {
    const created = await transaction.memberWorkoutPlan.create({
      data: {
        memberId: member.id,
        trainerId: actor.id,
        templateId: template.id,
        name: input.name,
        goal: input.goal ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        days: {
          create: template.days.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            notes: day.notes,
            exercises: {
              create: day.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                position: exercise.position,
                sets: exercise.sets,
                reps: exercise.reps,
                weightKg: exercise.weightKg,
                restSeconds: exercise.restSeconds,
                durationSeconds: exercise.durationSeconds,
                notes: exercise.notes,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      action: "MEMBER_WORKOUT_PLAN_CREATED",
      entityType: "MemberWorkoutPlan",
      entityId: created.id,
      after: { memberId: member.id, templateId: template.id, dayCount: template.days.length },
    });
    return created;
  });
  return { ok: true, data: { planId: plan.id } };
}

export async function getMemberWorkoutPlanOptions(actor: CurrentUser, memberId: string): Promise<{ templates: Array<{ id: string; name: string }>; canManage: boolean }> {
  const canManage = hasPermission(actor, "workout.manage");
  const member = await prisma.member.findFirst({
    where: { id: memberId, ...accessibleMemberWhere(actor) },
    select: { gymId: true, assignedTrainerId: true },
  });
  if (!member || (isTrainerRestricted(actor) && member.assignedTrainerId !== actor.id)) {
    return { templates: [], canManage: false };
  }
  const templates = canManage ? await prisma.workoutTemplate.findMany({
    where: { gymId: member.gymId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  }) : [];
  return { templates, canManage };
}

export async function listMemberWorkoutPlans(actor: CurrentUser, memberId: string): Promise<MemberWorkoutPlanListItem[]> {
  if (!hasPermission(actor, "member.read") && !hasPermission(actor, "workout.read") && !hasPermission(actor, "workout.manage")) return [];
  const member = await prisma.member.findFirst({ where: { id: memberId, ...accessibleMemberWhere(actor) }, select: { id: true } });
  if (!member) return [];
  const plans = await prisma.memberWorkoutPlan.findMany({
    where: { memberId },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true,
      name: true,
      goal: true,
      startDate: true,
      endDate: true,
      status: true,
      trainer: { select: { name: true } },
      template: { select: { name: true } },
      days: {
        orderBy: { dayNumber: "asc" },
        select: {
          id: true,
          title: true,
          notes: true,
          exercises: {
            orderBy: { position: "asc" },
            select: { id: true, sets: true, reps: true, weightKg: true, restSeconds: true, durationSeconds: true, notes: true, exercise: { select: { name: true } } },
          },
        },
      },
    },
  });
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    goal: plan.goal,
    startDate: plan.startDate,
    endDate: plan.endDate,
    status: plan.status,
    trainerName: plan.trainer.name,
    templateName: plan.template?.name ?? null,
    days: plan.days.map((day) => ({
      id: day.id,
      title: day.title,
      notes: day.notes,
      exercises: day.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseName: exercise.exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: exercise.weightKg,
        restSeconds: exercise.restSeconds,
        durationSeconds: exercise.durationSeconds,
        notes: exercise.notes,
      })),
    })),
  }));
}
