import { z } from "zod";

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );
}

function optionalEmail() {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  );
}

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Use a valid date.")
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .optional(),
);

export const memberInputSchema = z.object({
  primaryBranchId: z.string().min(1, "Choose a branch."),
  firstName: z.string().trim().min(1, "Enter a first name.").max(100),
  lastName: z.string().trim().min(1, "Enter a last name.").max(100),
  phone: optionalText(30),
  email: optionalEmail(),
  dateOfBirth: optionalDate,
  emergencyContactName: optionalText(150),
  emergencyContactPhone: optionalText(30),
  address: optionalText(500),
  assignedTrainerId: optionalText(100),
  notes: optionalText(5_000),
});

export type MemberInput = z.infer<typeof memberInputSchema>;
