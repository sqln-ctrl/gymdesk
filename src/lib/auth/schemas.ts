import { z } from "zod";

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.")
  .regex(/[^a-zA-Z0-9]/, "Include a symbol.");

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Enter your password."),
});

export const passwordResetRequestSchema = z.object({
  email: normalizedEmail,
});

export const passwordResetSchema = z.object({
  token: z.string().min(32, "This password reset link is invalid."),
  password: passwordSchema,
  passwordConfirmation: z.string(),
}).superRefine(({ password, passwordConfirmation }, context) => {
  if (password !== passwordConfirmation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords do not match.",
      path: ["passwordConfirmation"],
    });
  }
});

export const bootstrapSchema = z.object({
  gymName: z.string().trim().min(2, "Enter the gym name.").max(100),
  branchName: z.string().trim().min(2, "Enter the first branch name.").max(100),
  branchCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,12}$/, "Use 2–12 uppercase letters, numbers, or hyphens."),
  ownerName: z.string().trim().min(2, "Enter the owner name.").max(100),
  email: normalizedEmail,
  password: passwordSchema,
  passwordConfirmation: z.string(),
}).superRefine(({ password, passwordConfirmation }, context) => {
  if (password !== passwordConfirmation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords do not match.",
      path: ["passwordConfirmation"],
    });
  }
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type BootstrapInput = z.infer<typeof bootstrapSchema>;
