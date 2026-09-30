"use client";

import { useActionState } from "react";

import { initialBillingFormState } from "@/lib/billing/form-state";
import { voidInvoiceAction } from "@/server/actions/billing";

export function VoidInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, isPending] = useActionState(voidInvoiceAction, initialBillingFormState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input name="invoiceId" type="hidden" value={invoiceId} />
      <input
        className="h-9 flex-1 rounded-lg border px-3 text-xs"
        minLength={3}
        name="reason"
        placeholder="Reason for voiding"
        required
      />
      <button
        className="h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Voiding..." : "Void invoice"}
      </button>
      {state.message ? (
        <p className={`text-xs sm:basis-full ${state.status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
