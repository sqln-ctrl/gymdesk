export type InvoiceSettlement = {
  paidMinor: number;
  balanceMinor: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
};

function assertMoney(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer in minor units.`);
  }
}

export function calculateInvoiceSettlement(
  totalMinor: number,
  paidMinor: number,
): InvoiceSettlement {
  assertMoney(totalMinor, "Invoice total");
  assertMoney(paidMinor, "Paid amount");

  if (paidMinor > totalMinor) {
    throw new RangeError("Paid amount cannot exceed the invoice total.");
  }

  const balanceMinor = totalMinor - paidMinor;

  return {
    paidMinor,
    balanceMinor,
    status: balanceMinor === 0 ? "PAID" : paidMinor === 0 ? "UNPAID" : "PARTIALLY_PAID",
  };
}
