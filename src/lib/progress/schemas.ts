import { z } from "zod";

const numericMeasurementKeys = [
  "weightKg",
  "bodyFatPercent",
  "chestCm",
  "waistCm",
  "hipsCm",
  "armsCm",
  "thighsCm",
] as const;

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maxLength).optional(),
  );
}

function optionalNumber(min: number, max: number) {
  return z.preprocess(
    (value) => {
      if (value === null || value === undefined) return undefined;
      return typeof value === "string" && value.trim() === "" ? undefined : value;
    },
    z.coerce.number().finite().min(min).max(max).optional(),
  );
}

const recordedDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid date.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const progressEntryInputSchema = z.object({
  recordedAt: recordedDate,
  weightKg: optionalNumber(10, 500),
  bodyFatPercent: optionalNumber(0, 100),
  chestCm: optionalNumber(1, 500),
  waistCm: optionalNumber(1, 500),
  hipsCm: optionalNumber(1, 500),
  armsCm: optionalNumber(1, 250),
  thighsCm: optionalNumber(1, 300),
  notes: optionalText(2_000),
}).superRefine((input, context) => {
  if (numericMeasurementKeys.every((key) => input[key] === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weightKg"],
      message: "Enter at least one measurement.",
    });
  }
});

export type ProgressEntryInput = z.infer<typeof progressEntryInputSchema>;
