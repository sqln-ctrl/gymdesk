"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { bootstrapAction } from "@/server/actions/auth";
import { initialAuthFormState } from "@/lib/auth/form-state";

type BootstrapField = {
  id: "gymName" | "branchName" | "branchCode" | "ownerName" | "email";
  label: string;
  type: "text" | "email";
  autoComplete?: string;
  defaultValue?: string;
};

const fields: readonly BootstrapField[] = [
  { id: "gymName", label: "Gym name", type: "text", autoComplete: "organization" },
  { id: "branchName", label: "First branch name", type: "text" },
  { id: "branchCode", label: "Branch code", type: "text", defaultValue: "MAIN" },
  { id: "ownerName", label: "Your name", type: "text", autoComplete: "name" },
  { id: "email", label: "Owner email", type: "email", autoComplete: "email" },
];

export function BootstrapForm() {
  const [state, formAction] = useActionState(bootstrapAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div className={field.id === "gymName" || field.id === "ownerName" || field.id === "email" ? "sm:col-span-2" : ""} key={field.id}>
            <label className="text-sm font-medium" htmlFor={field.id}>
              {field.label}
            </label>
            <input
              aria-describedby={state.fieldErrors?.[field.id] ? `${field.id}-error` : undefined}
              autoComplete={field.autoComplete}
              className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm"
              defaultValue={field.defaultValue}
              id={field.id}
              name={field.id}
              required
              type={field.type}
            />
            {state.fieldErrors?.[field.id] ? (
              <p className="mt-1 text-sm text-[var(--danger)]" id={`${field.id}-error`}>
                {state.fieldErrors[field.id][0]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Owner password
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
          Confirm owner password
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
      <SubmitButton pendingChildren="Creating secure workspace…">Create GymFlow workspace</SubmitButton>
    </form>
  );
}
