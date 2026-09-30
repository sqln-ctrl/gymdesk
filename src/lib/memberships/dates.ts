import type { MembershipDurationUnit, MembershipStatus } from "@/lib/memberships/constants";

export type MembershipFreezePeriod = {
  startDate: Date;
  endDate: Date;
  unfrozenAt: Date | null;
};

export type MembershipStatusInput = {
  startDate: Date;
  endDate: Date;
  cancelledAt: Date | null;
  freezes: MembershipFreezePeriod[];
};

export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function addUtcDays(value: Date, days: number): Date {
  const result = startOfUtcDay(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addUtcMonths(value: Date, months: number): Date {
  const day = value.getUTCDate();
  const monthIndex = value.getUTCMonth() + months;
  const year = value.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;

  return new Date(Date.UTC(year, month, Math.min(day, daysInUtcMonth(year, month))));
}

export function membershipEndDate(
  startDate: Date,
  durationValue: number,
  durationUnit: MembershipDurationUnit,
): Date {
  if (!Number.isSafeInteger(durationValue) || durationValue < 1) {
    throw new RangeError("Membership duration must be a positive whole number.");
  }

  const start = startOfUtcDay(startDate);
  return durationUnit === "DAYS"
    ? addUtcDays(start, durationValue - 1)
    : addUtcDays(addUtcMonths(start, durationValue), -1);
}

export function inclusiveUtcDays(startDate: Date, endDate: Date): number {
  const difference = startOfUtcDay(endDate).getTime() - startOfUtcDay(startDate).getTime();
  if (difference < 0) return 0;
  return Math.floor(difference / 86_400_000) + 1;
}

export function renewalStartDate(currentEndDate: Date, now = new Date()): Date {
  const dayAfterCurrentMembership = addUtcDays(currentEndDate, 1);
  const today = startOfUtcDay(now);
  return dayAfterCurrentMembership > today ? dayAfterCurrentMembership : today;
}

export function deriveMembershipStatus(input: MembershipStatusInput, now = new Date()): MembershipStatus {
  const today = startOfUtcDay(now);
  if (input.cancelledAt) return "CANCELLED";
  if (today < startOfUtcDay(input.startDate)) return "PENDING";
  if (today > startOfUtcDay(input.endDate)) return "EXPIRED";

  const isFrozen = input.freezes.some((freeze) => (
    freeze.unfrozenAt === null
    && startOfUtcDay(freeze.startDate) <= today
    && today <= startOfUtcDay(freeze.endDate)
  ));

  return isFrozen ? "FROZEN" : "ACTIVE";
}
