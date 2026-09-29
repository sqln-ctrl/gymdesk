import { describe, expect, it } from "vitest";

import { formatMoney, sumMoney } from "./money";

describe("money helpers", () => {
  it("adds minor-unit amounts without decimal arithmetic", () => {
    expect(sumMoney(19_999, 1, -2_500)).toBe(17_500);
  });

  it("formats an amount stored in minor units", () => {
    expect(formatMoney(12_500, "PKR", "en-PK")).toContain("125");
  });

  it("rejects non-integer money", () => {
    expect(() => sumMoney(10.5)).toThrow("safe integer");
  });
});
