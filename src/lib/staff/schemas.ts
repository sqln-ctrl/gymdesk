import { z } from "zod";

import { passwordSchema } from "@/lib/auth/schemas";

const staffRoleSchema = z.enum(["BRANCH_ADMIN", "RECEPTIONIST", "TRAINER"]);
const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

const sharedStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: optionalText(30),
  roleKey: staffRoleSchema,
  branchIds: z.array(z.string().cuid()).min(1, "Assign at least one branch."),
  hireDate: z.preprocess(
    (value) => typeof value === "string" && value ? new Date(`${value}T00:00:00.000Z`) : undefined,
    z.date().optional(),
  ),
  specialization: optionalText(200),
  certifications: optionalText(2_000),
});

export const createStaffInputSchema = sharedStaffSchema.extend({
  password: passwordSchema,
  passwordConfirmation: z.string(),
}).superRefine(({ password, passwordConfirmation }, context) => {
  if (password !== passwordConfirmation) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Passwords do not match.", path: ["passwordConfirmation"] });
  }
});

export const updateStaffInputSchema = sharedStaffSchema;

export type CreateStaffInput = z.infer<typeof createStaffInputSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffInputSchema>;
