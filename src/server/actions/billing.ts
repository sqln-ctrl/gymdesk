"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { BillingFormState } from "@/lib/billing/form-state";
import {
  paymentInputSchema,
  refundInputSchema,
  voidInvoiceInputSchema,
} from "@/lib/billing/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { recordPayment, refundPayment, voidInvoice } from "@/server/services/billing";

function sessionError(): BillingFormState {
  return { status: "error", message: "Your session has expired. Sign in again to continue." };
}

function revalidateInvoice(invoiceId: string): void {
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/memberships");
}

export async function recordPaymentAction(
  _previousState: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "payment.record")) {
    return { status: "error", message: "You do not have permission to record payments." };
  }

  const parsed = paymentInputSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amountMinor: formData.get("amountMinor"),
    method: formData.get("method"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid payment amount and method." };
  }

  const result = await recordPayment(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateInvoice(parsed.data.invoiceId);
  return { status: "success", message: "Payment recorded." };
}

export async function refundPaymentAction(
  _previousState: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "payment.refund")) {
    return { status: "error", message: "You do not have permission to refund payments." };
  }

  const parsed = refundInputSchema.safeParse({
    paymentId: formData.get("paymentId"),
    amountMinor: formData.get("amountMinor"),
    reason: formData.get("reason"),
  });
  const invoiceId = formData.get("invoiceId");
  if (!parsed.success || typeof invoiceId !== "string") {
    return { status: "error", message: "Enter a valid refund amount and reason." };
  }

  const result = await refundPayment(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateInvoice(invoiceId);
  return { status: "success", message: "Refund recorded; the original payment remains in the audit trail." };
}

export async function voidInvoiceAction(
  _previousState: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "invoice.void")) {
    return { status: "error", message: "You do not have permission to void invoices." };
  }

  const parsed = voidInvoiceInputSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a reason with at least three characters to void this invoice." };
  }

  const result = await voidInvoice(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateInvoice(parsed.data.invoiceId);
  return { status: "success", message: "Invoice voided." };
}
