"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMemberFormState } from "@/lib/members/form-state";
import { uploadMemberAvatarAction } from "@/server/actions/members";

function AvatarSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="inline-flex h-10 items-center justify-center rounded-lg border bg-[var(--surface)] px-4 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:pointer-events-none disabled:opacity-50" disabled={pending} type="submit">
      {pending ? "Uploading…" : "Upload photo"}
    </button>
  );
}

export function MemberAvatarForm({ memberId }: { memberId: string }) {
  const action = uploadMemberAvatarAction.bind(null, memberId);
  const [state, formAction] = useActionState(action, initialMemberFormState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="min-w-0 flex-1 text-sm">
        <span className="sr-only">Choose member photo</span>
        <input accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--brand)]" name="avatar" required type="file" />
      </label>
      <AvatarSubmitButton />
      {state.message ? <p className="text-sm text-[var(--danger)]" role="alert">{state.message}</p> : null}
    </form>
  );
}
