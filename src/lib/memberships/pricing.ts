import { sumMoney } from "@/lib/money";

export type MembershipPricingInput = {
  priceMinor: number;
  registrationFeeMinor: number;
  discountMinor: number;
  taxRateBasisPoints: number;
};

export type MembershipPricing = {
  priceMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export function calculateMembershipPricing(input: MembershipPricingInput): MembershipPricing {
  const subtotal = sumMoney(input.priceMinor, input.registrationFeeMinor);
  if (!Number.isSafeInteger(input.discountMinor) || input.discountMinor < 0 || input.discountMinor > subtotal) {
    throw new RangeError("Membership discount must not exceed the subtotal.");
  }
  if (!Number.isSafeInteger(input.taxRateBasisPoints) || input.taxRateBasisPoints < 0 || input.taxRateBasisPoints > 10_000) {
    throw new RangeError("Membership tax rate is invalid.");
  }

  const taxableMinor = subtotal - input.discountMinor;
  const taxMinor = Math.round((taxableMinor * input.taxRateBasisPoints) / 10_000);
  if (!Number.isSafeInteger(taxMinor)) {
    throw new RangeError("Membership tax exceeds the safe integer range.");
  }

  return {
    priceMinor: subtotal,
    discountMinor: input.discountMinor,
    taxMinor,
    totalMinor: sumMoney(taxableMinor, taxMinor),
  };
}
