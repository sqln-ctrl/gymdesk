export const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "DIGITAL_WALLET",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  DIGITAL_WALLET: "Digital wallet",
};
