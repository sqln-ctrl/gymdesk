"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { resetPasswordAction } from "@/server/actions/auth";
import { initialAuthFormState } from "@/lib/auth/form-state";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input name="token" type="hidden" value={token} />
      {state.message ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          New password
        </label>
        <input
          aria-describedby={state.fieldErrors?.password ? "password-error" : "password-help"}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
          id="password"
          name="password"
          required
          type="password"
        />
        <p className="text-xs leading-5 text-[var(--muted-foreground)]" id="password-help">
          Use 12+ characters with uppercase, lowercase, number, and symbol.
        </p>
        {state.fieldErrors?.password ? (
          <p className="text-sm text-[var(--danger)]" id="password-error">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="passwordConfirmation">
          Confirm new password
        </label>
        <input
          aria-describedby={state.fieldErrors?.passwordConfirmation ? "password-confirmation-error" : undefined}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
          id="passwordConfirmation"
          name="passwordConfirmation"
          required
          type="password"
        />
        {state.fieldErrors?.passwordConfirmation ? (
          <p className="text-sm text-[var(--danger)]" id="password-confirmation-error">
            {state.fieldErrors.passwordConfirmation[0]}
          </p>
        ) : null}
      </div>
      <SubmitButton pendingChildren="Updating password…">Update password</SubmitButton>
    </form>
  );
}
