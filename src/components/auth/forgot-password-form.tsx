"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { requestPasswordResetAction } from "@/server/actions/auth";
import { initialAuthFormState } from "@/lib/auth/form-state";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.status === "error" ? "bg-red-50 text-red-800" : "bg-[var(--brand-soft)] text-[var(--brand)]"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      {state.developmentResetPath ? (
        <Link className="block rounded-lg border border-[var(--brand)] px-3 py-2 text-center text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)]" href={state.developmentResetPath}>
          Open local reset link
        </Link>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email address
        </label>
        <input
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          autoComplete="email"
          className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
          id="email"
          name="email"
          required
          type="email"
        />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-[var(--danger)]" id="email-error">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>
      <SubmitButton pendingChildren="Preparing reset link…">Request password reset</SubmitButton>
    </form>
  );
}
