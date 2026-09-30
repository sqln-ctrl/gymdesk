"use client";

import { useActionState } from "react";

import { initialBillingFormState } from "@/lib/billing/form-state";
import { refundPaymentAction } from "@/server/actions/billing";

export function RefundForm({
  invoiceId,
  paymentId,
  remainingMinor,
}: {
  invoiceId: string;
  paymentId: string;
  remainingMinor: number;
}) {
  const [state, formAction, isPending] = useActionState(refundPaymentAction, initialBillingFormState);

  if (remainingMinor === 0) return null;

  return (
    <form action={formAction} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
      <input name="invoiceId" type="hidden" value={invoiceId} />
      <input name="paymentId" type="hidden" value={paymentId} />
      <input className="h-9 rounded-lg border px-3 text-xs" name="reason" placeholder="Refund reason" required />
      <input
        aria-label="Refund amount in minor units"
        className="h-9 rounded-lg border px-3 text-xs"
        defaultValue={remainingMinor}
        max={remainingMinor}
        min="1"
        name="amountMinor"
        type="number"
      />
      <button
        className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Refunding..." : "Refund"}
      </button>
      {state.message ? (
        <p className={`text-xs sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
