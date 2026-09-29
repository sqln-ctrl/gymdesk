"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialMemberFormState } from "@/lib/members/form-state";
import { createMemberAction, updateMemberAction } from "@/server/actions/members";

type BranchOption = { id: string; label: string };
type TrainerOption = { id: string; name: string };

export type EditableMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
  assignedTrainerId: string | null;
  notes: string | null;
  branchId: string;
};

type MemberFormProps = {
  branches: BranchOption[];
  trainers: TrainerOption[];
  member?: EditableMember;
};

function SaveMemberButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving…" : editing ? "Save changes" : "Create member"}
    </button>
  );
}

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const message = errors?.[field]?.[0];

  return message ? (
    <p className="mt-1 text-sm text-[var(--danger)]" id={`${field}-error`}>
      {message}
    </p>
  ) : null;
}

export function MemberForm({ branches, trainers, member }: MemberFormProps) {
  const action = member ? updateMemberAction.bind(null, member.id) : createMemberAction;
  const [state, formAction] = useActionState(action, initialMemberFormState);
  const inputClassName = "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm";
  const textareaClassName = "mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm";

  return (
    <form action={formAction} className="space-y-7" noValidate>
      {state.message ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      <section>
        <h2 className="text-base font-semibold">Member details</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Add the contact information used by your front desk.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="firstName">First name</label>
            <input aria-describedby={state.fieldErrors?.firstName ? "firstName-error" : undefined} autoComplete="given-name" className={inputClassName} defaultValue={member?.firstName} id="firstName" maxLength={100} name="firstName" required />
            <FieldError errors={state.fieldErrors} field="firstName" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="lastName">Last name</label>
            <input aria-describedby={state.fieldErrors?.lastName ? "lastName-error" : undefined} autoComplete="family-name" className={inputClassName} defaultValue={member?.lastName} id="lastName" maxLength={100} name="lastName" required />
            <FieldError errors={state.fieldErrors} field="lastName" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="phone">Phone</label>
            <input aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined} autoComplete="tel" className={inputClassName} defaultValue={member?.phone ?? undefined} id="phone" maxLength={30} name="phone" type="tel" />
            <FieldError errors={state.fieldErrors} field="phone" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} autoComplete="email" className={inputClassName} defaultValue={member?.email ?? undefined} id="email" name="email" type="email" />
            <FieldError errors={state.fieldErrors} field="email" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="dateOfBirth">Date of birth</label>
            <input aria-describedby={state.fieldErrors?.dateOfBirth ? "dateOfBirth-error" : undefined} className={inputClassName} defaultValue={member?.dateOfBirth ?? undefined} id="dateOfBirth" name="dateOfBirth" type="date" />
            <FieldError errors={state.fieldErrors} field="dateOfBirth" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="primaryBranchId">Primary branch</label>
            <select aria-describedby={state.fieldErrors?.primaryBranchId ? "primaryBranchId-error" : undefined} className={inputClassName} defaultValue={member?.branchId ?? (branches.length === 1 ? branches[0].id : "")} id="primaryBranchId" name="primaryBranchId" required>
              <option disabled value="">Choose a branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
            </select>
            <FieldError errors={state.fieldErrors} field="primaryBranchId" />
          </div>
        </div>
      </section>

      <section className="border-t pt-7">
        <h2 className="text-base font-semibold">Safety and coaching</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="emergencyContactName">Emergency contact name</label>
            <input aria-describedby={state.fieldErrors?.emergencyContactName ? "emergencyContactName-error" : undefined} className={inputClassName} defaultValue={member?.emergencyContactName ?? undefined} id="emergencyContactName" maxLength={150} name="emergencyContactName" />
            <FieldError errors={state.fieldErrors} field="emergencyContactName" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="emergencyContactPhone">Emergency contact phone</label>
            <input aria-describedby={state.fieldErrors?.emergencyContactPhone ? "emergencyContactPhone-error" : undefined} autoComplete="tel" className={inputClassName} defaultValue={member?.emergencyContactPhone ?? undefined} id="emergencyContactPhone" maxLength={30} name="emergencyContactPhone" type="tel" />
            <FieldError errors={state.fieldErrors} field="emergencyContactPhone" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="assignedTrainerId">Assigned trainer</label>
            <select aria-describedby={state.fieldErrors?.assignedTrainerId ? "assignedTrainerId-error" : undefined} className={inputClassName} defaultValue={member?.assignedTrainerId ?? ""} id="assignedTrainerId" name="assignedTrainerId">
              <option value="">No trainer assigned</option>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">The trainer must be assigned to the selected branch.</p>
            <FieldError errors={state.fieldErrors} field="assignedTrainerId" />
          </div>
        </div>
      </section>

      <section className="border-t pt-7">
        <h2 className="text-base font-semibold">Internal notes</h2>
        <div className="mt-5 grid gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="address">Address</label>
            <textarea aria-describedby={state.fieldErrors?.address ? "address-error" : undefined} className={textareaClassName} defaultValue={member?.address ?? undefined} id="address" maxLength={500} name="address" rows={3} />
            <FieldError errors={state.fieldErrors} field="address" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="notes">Staff notes</label>
            <textarea aria-describedby={state.fieldErrors?.notes ? "notes-error" : undefined} className={textareaClassName} defaultValue={member?.notes ?? undefined} id="notes" maxLength={5000} name="notes" rows={5} />
            <FieldError errors={state.fieldErrors} field="notes" />
          </div>
        </div>
      </section>

      <div className="flex justify-end border-t pt-6">
        <SaveMemberButton editing={Boolean(member)} />
      </div>
    </form>
  );
}
