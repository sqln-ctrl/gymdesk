"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import type { WorkoutFormState } from "@/lib/workouts/form-state";
import { exerciseInputSchema, memberWorkoutPlanInputSchema, workoutTemplateInputSchema } from "@/lib/workouts/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { createExercise, createMemberWorkoutPlan, createWorkoutTemplate, setExerciseActive, updateWorkoutTemplate } from "@/server/services/workouts";

export async function createExerciseAction(_previousState: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  if (!hasPermission(actor, "workout.manage")) return { status: "error", message: "You do not have permission to manage exercises." };
  const parsed = exerciseInputSchema.safeParse({ gymId: formData.get("gymId"), name: formData.get("name"), category: formData.get("category"), equipment: formData.get("equipment"), instructions: formData.get("instructions"), mediaUrl: formData.get("mediaUrl") });
  if (!parsed.success) return { status: "error", message: "Enter a valid exercise name and optional details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const result = await createExercise(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/workouts");
  return { status: "success", message: "Exercise added to the library." };
}

export async function setExerciseActiveAction(exerciseId: string, isActive: boolean, _previousState: WorkoutFormState, _formData: FormData): Promise<WorkoutFormState> {
  void _previousState;
  void _formData;
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "workout.manage") || !z.string().cuid().safeParse(exerciseId).success) return { status: "error", message: "You do not have permission to manage this exercise." };
  const result = await setExerciseActive(actor, exerciseId, isActive);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/workouts");
  return { status: "success", message: isActive ? "Exercise reactivated." : "Exercise deactivated." };
}

function parseTemplateValues(formData: FormData) {
  const rawDays = formData.get("daysJson");
  let days: unknown;
  try {
    days = typeof rawDays === "string" ? JSON.parse(rawDays) : undefined;
  } catch {
    days = undefined;
  }
  return {
    gymId: formData.get("gymId"),
    name: formData.get("name"),
    description: formData.get("description"),
    days,
  };
}

export async function createWorkoutTemplateAction(_previousState: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "workout.manage")) return { status: "error", message: "You do not have permission to manage workout templates." };
  const parsed = workoutTemplateInputSchema.safeParse(parseTemplateValues(formData));
  if (!parsed.success) return { status: "error", message: "Add at least one named day with an exercise and valid training values." };
  const result = await createWorkoutTemplate(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/workouts");
  revalidatePath("/workouts/templates");
  return { status: "success", message: "Workout template created." };
}

export async function updateWorkoutTemplateAction(templateId: string, _previousState: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "workout.manage") || !z.string().cuid().safeParse(templateId).success) return { status: "error", message: "You do not have permission to update this workout template." };
  const parsed = workoutTemplateInputSchema.safeParse(parseTemplateValues(formData));
  if (!parsed.success) return { status: "error", message: "Add at least one named day with an exercise and valid training values." };
  const result = await updateWorkoutTemplate(actor, templateId, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/workouts");
  revalidatePath("/workouts/templates");
  revalidatePath(`/workouts/templates/${templateId}`);
  return { status: "success", message: "Workout template updated." };
}

export async function createMemberWorkoutPlanAction(_previousState: WorkoutFormState, formData: FormData): Promise<WorkoutFormState> {
  const actor = await getCurrentUser();
  if (!actor || !hasPermission(actor, "workout.manage")) return { status: "error", message: "You do not have permission to create member workout plans." };
  const parsed = memberWorkoutPlanInputSchema.safeParse({ memberId: formData.get("memberId"), templateId: formData.get("templateId"), name: formData.get("name"), goal: formData.get("goal"), startDate: formData.get("startDate"), endDate: formData.get("endDate") });
  if (!parsed.success) return { status: "error", message: "Enter a valid plan name, template, and dates." };
  const result = await createMemberWorkoutPlan(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath(`/members/${parsed.data.memberId}`);
  revalidatePath(`/members/${parsed.data.memberId}/workouts`);
  return { status: "success", message: "Workout plan copied to the member." };
}
