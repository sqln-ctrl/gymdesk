"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/server/actions/auth";
import { initialAuthFormState } from "@/lib/auth/form-state";
import { SubmitButton } from "@/components/auth/submit-button";

type LoginFormProps = {
  resetComplete: boolean;
};

export function LoginForm({ resetComplete }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {resetComplete ? (
        <p className="rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand)]">
          Password updated. You can now sign in.
        </p>
      ) : null}
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
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Link className="text-sm font-medium text-[var(--brand)] hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <input
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
          id="password"
          name="password"
          required
          type="password"
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-[var(--danger)]" id="password-error">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>
      <SubmitButton pendingChildren="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
