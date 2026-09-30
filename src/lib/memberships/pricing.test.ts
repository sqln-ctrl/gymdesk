import { describe, expect, it } from "vitest";

import { calculateMembershipPricing } from "./pricing";

describe("membership pricing", () => {
  it("calculates price, discount, and tax in minor units", () => {
    expect(calculateMembershipPricing({
      priceMinor: 10_000,
      registrationFeeMinor: 500,
      discountMinor: 1_000,
      taxRateBasisPoints: 1_700,
    })).toEqual({
      priceMinor: 10_500,
      discountMinor: 1_000,
      taxMinor: 1_615,
      totalMinor: 11_115,
    });
  });

  it("rejects a discount larger than the membership subtotal", () => {
    expect(() => calculateMembershipPricing({
      priceMinor: 500,
      registrationFeeMinor: 0,
      discountMinor: 501,
      taxRateBasisPoints: 0,
    })).toThrow("discount");
  });
});
