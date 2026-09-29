export function formatMoney(
  amountMinor: number,
  currency = "PKR",
  locale = "en-PK",
): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new TypeError("Money amounts must be safe integer minor units.");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function sumMoney(...amountsMinor: number[]): number {
  const total = amountsMinor.reduce((sum, amount) => {
    if (!Number.isSafeInteger(amount)) {
      throw new TypeError("Money amounts must be safe integer minor units.");
    }

    return sum + amount;
  }, 0);

  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Money total exceeds the safe integer range.");
  }

  return total;
}
