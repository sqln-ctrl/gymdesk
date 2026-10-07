import { z } from "zod";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

export const gymSettingsSchema = z.object({
  gymId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  logoUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url().max(500).optional(),
  ),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
  timezone: z.string().trim().min(1).max(100),
});

export const branchSettingsSchema = z.object({
  branchId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  phone: optionalText(30),
  email: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email().max(320).optional(),
  ),
  address: optionalText(500),
});

export type GymSettingsInput = z.infer<typeof gymSettingsSchema>;
export type BranchSettingsInput = z.infer<typeof branchSettingsSchema>;
