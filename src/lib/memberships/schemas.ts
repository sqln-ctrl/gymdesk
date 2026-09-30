import { z } from "zod";

import { MEMBERSHIP_DURATION_UNITS } from "@/lib/memberships/constants";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid date.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const optionalText = (maximum: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(maximum).optional(),
);

const moneyInput = z.coerce.number().int("Use whole minor units.").min(0);

export const membershipPlanInputSchema = z.object({
  gymId: z.string().cuid(),
  name: z.string().trim().min(1, "Enter a plan name.").max(100),
  description: optionalText(1_000),
  durationValue: z.coerce.number().int().min(1).max(3_650),
  durationUnit: z.enum(MEMBERSHIP_DURATION_UNITS),
  priceMinor: moneyInput,
  registrationFeeMinor: moneyInput,
  taxRateBasisPoints: z.coerce.number().int().min(0).max(10_000),
  freezeDaysAllowed: z.coerce.number().int().min(0).max(365),
  graceDays: z.coerce.number().int().min(0).max(365),
});

export const sellMembershipInputSchema = z.object({
  memberId: z.string().cuid(),
  branchId: z.string().cuid(),
  planId: z.string().cuid(),
  startDate: dateOnly,
  discountMinor: moneyInput,
});

export const membershipFreezeInputSchema = z.object({
  startDate: dateOnly,
  endDate: dateOnly,
  reason: z.string().trim().min(3, "Provide a reason for the freeze.").max(500),
}).refine((value) => value.endDate >= value.startDate, {
  message: "Freeze end date must be on or after the start date.",
  path: ["endDate"],
});

export const membershipExpiryOverrideSchema = z.object({
  endDate: dateOnly,
  reason: z.string().trim().min(3, "Provide a reason for the expiry override.").max(500),
});

export const membershipCancellationSchema = z.object({
  reason: z.string().trim().min(3, "Provide a cancellation reason.").max(500),
});

export type MembershipPlanInput = z.infer<typeof membershipPlanInputSchema>;
export type SellMembershipInput = z.infer<typeof sellMembershipInputSchema>;
export type MembershipFreezeInput = z.infer<typeof membershipFreezeInputSchema>;
export type MembershipExpiryOverrideInput = z.infer<typeof membershipExpiryOverrideSchema>;
export type MembershipCancellationInput = z.infer<typeof membershipCancellationSchema>;
