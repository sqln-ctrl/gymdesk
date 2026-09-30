import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const exerciseInputSchema = z.object({
  gymId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  category: optionalText(100),
  equipment: optionalText(100),
  instructions: optionalText(2_000),
  mediaUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url().max(500).optional(),
  ),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

const workoutExerciseSchema = z.object({
  exerciseId: z.string().cuid(),
  sets: z.number().int().min(1).max(100).optional(),
  reps: optionalText(40),
  weightKg: z.number().finite().min(0).max(2_000).optional(),
  restSeconds: z.number().int().min(0).max(3_600).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  notes: optionalText(500),
});

const workoutDaySchema = z.object({
  title: z.string().trim().min(1).max(100),
  notes: optionalText(1_000),
  exercises: z.array(workoutExerciseSchema).min(1).max(30),
});

export const workoutTemplateInputSchema = z.object({
  gymId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  description: optionalText(1_000),
  days: z.array(workoutDaySchema).min(1).max(14),
});

export const memberWorkoutPlanInputSchema = z.object({
  memberId: z.string().cuid(),
  templateId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  goal: optionalText(1_000),
  startDate: z.preprocess(
    (value) => typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value,
    z.date(),
  ),
  endDate: z.preprocess(
    (value) => typeof value === "string" && value ? new Date(`${value}T00:00:00.000Z`) : undefined,
    z.date().optional(),
  ),
}).refine((input) => !input.endDate || input.endDate >= input.startDate, {
  path: ["endDate"],
  message: "End date cannot be before the start date.",
});

export type WorkoutTemplateInput = z.infer<typeof workoutTemplateInputSchema>;
export type MemberWorkoutPlanInput = z.infer<typeof memberWorkoutPlanInputSchema>;
