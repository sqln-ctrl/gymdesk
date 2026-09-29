"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMemberFormState } from "@/lib/members/form-state";
import { changeMemberStatusAction } from "@/server/actions/members";

function StatusButton({ archive }: { archive: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={archive ? "inline-flex h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:pointer-events-none disabled:opacity-50" : "inline-flex h-10 items-center justify-center rounded-lg border bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:pointer-events-none disabled:opacity-50"}
      disabled={pending}
      type="submit"
    >
      {pending ? "Updating…" : archive ? "Archive member" : "Reactivate member"}
    </button>
  );
}

export function MemberStatusForm({ memberId, currentStatus }: { memberId: string; currentStatus: string }) {
  const archive = currentStatus !== "ARCHIVED";
  const nextStatus = archive ? "ARCHIVED" : "ACTIVE";
  const action = changeMemberStatusAction.bind(null, memberId, nextStatus);
  const [state, formAction] = useActionState(action, initialMemberFormState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        const message = archive
          ? "Archive this member? Their historical records will be kept."
          : "Reactivate this member?";
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <StatusButton archive={archive} />
      {state.message ? <p className="text-sm text-[var(--danger)]" role="alert">{state.message}</p> : null}
    </form>
  );
}
