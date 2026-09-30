import { describe, expect, it } from "vitest";

import { calculateInvoiceSettlement } from "./calculations";

describe("invoice settlement", () => {
  it("derives unpaid, partial, and paid states from minor-unit amounts", () => {
    expect(calculateInvoiceSettlement(10_000, 0)).toEqual({
      paidMinor: 0,
      balanceMinor: 10_000,
      status: "UNPAID",
    });
    expect(calculateInvoiceSettlement(10_000, 2_500)).toEqual({
      paidMinor: 2_500,
      balanceMinor: 7_500,
      status: "PARTIALLY_PAID",
    });
    expect(calculateInvoiceSettlement(10_000, 10_000)).toEqual({
      paidMinor: 10_000,
      balanceMinor: 0,
      status: "PAID",
    });
  });

  it("rejects an overpayment instead of allowing a negative balance", () => {
    expect(() => calculateInvoiceSettlement(100, 101)).toThrow("cannot exceed");
  });
});
