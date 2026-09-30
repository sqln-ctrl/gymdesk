import { z } from "zod";

import { PAYMENT_METHODS } from "./constants";

export const paymentInputSchema = z.object({
  invoiceId: z.string().cuid(),
  amountMinor: z.coerce.number().int().positive(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(100).optional()),
});

export const refundInputSchema = z.object({
  paymentId: z.string().cuid(),
  amountMinor: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
});

export const voidInvoiceInputSchema = z.object({
  invoiceId: z.string().cuid(),
  reason: z.string().trim().min(3).max(500),
});
