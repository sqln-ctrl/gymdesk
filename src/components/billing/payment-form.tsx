"use client";

import { useActionState } from "react";

import { initialBillingFormState } from "@/lib/billing/form-state";
import { recordPaymentAction } from "@/server/actions/billing";

export function PaymentForm({ invoiceId, balanceMinor }: { invoiceId: string; balanceMinor: number }) {
  const [state, formAction, isPending] = useActionState(recordPaymentAction, initialBillingFormState);

  if (balanceMinor === 0) return null;

  return (
    <form action={formAction} className="mt-4 grid gap-2 sm:grid-cols-4">
      <input name="invoiceId" type="hidden" value={invoiceId} />
      <input
        aria-label="Payment amount in minor units"
        className="h-10 rounded-lg border px-3 text-sm"
        defaultValue={balanceMinor}
        min="1"
        name="amountMinor"
        type="number"
      />
      <select className="h-10 rounded-lg border px-3 text-sm" defaultValue="CASH" name="method">
        <option value="CASH">Cash</option>
        <option value="CARD">Card</option>
        <option value="BANK_TRANSFER">Bank transfer</option>
        <option value="DIGITAL_WALLET">Digital wallet</option>
      </select>
      <input className="h-10 rounded-lg border px-3 text-sm" name="reference" placeholder="Reference" />
      <button
        className="h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Recording..." : "Record payment"}
      </button>
      {state.message ? (
        <p className={`text-sm sm:col-span-4 ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
