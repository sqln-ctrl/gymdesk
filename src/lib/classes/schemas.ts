import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

const localDateTime = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a valid date and time.")
  .refine((value) => !Number.isNaN(new Date(`${value}:00.000Z`).getTime()), "Choose a valid date and time.")
  .transform((value) => new Date(`${value}:00.000Z`));

export const fitnessClassInputSchema = z.object({
  branchId: z.string().cuid(),
  trainerId: z.preprocess((value) => value === "" ? undefined : value, z.string().cuid().optional()),
  name: z.string().trim().min(2).max(120),
  description: optionalText(1_000),
  room: optionalText(100),
  defaultCapacity: z.coerce.number().int().min(1).max(500),
  defaultDurationMinutes: z.coerce.number().int().min(15).max(600),
  firstSessionAt: localDateTime,
  occurrences: z.coerce.number().int().min(1).max(52),
  repeatEveryDays: z.coerce.number().int().min(1).max(31),
});

export const classBookingInputSchema = z.object({
  sessionId: z.string().cuid(),
  memberId: z.string().cuid(),
});

export const attendanceInputSchema = z.object({
  bookingId: z.string().cuid(),
  status: z.enum(["ATTENDED", "NO_SHOW"]),
});

export type FitnessClassInput = z.infer<typeof fitnessClassInputSchema>;
