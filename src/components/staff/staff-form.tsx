"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialStaffFormState } from "@/lib/staff/form-state";
import { createStaffAction, updateStaffAction } from "@/server/actions/staff";

type BranchOption = { id: string; label: string };
type RoleKey = "BRANCH_ADMIN" | "RECEPTIONIST" | "TRAINER";

export type EditableStaff = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleKey: string | null;
  branchIds: string[];
  hireDate: string | null;
  specialization: string | null;
  certifications: string | null;
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <button className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving..." : editing ? "Save staff profile" : "Create staff account"}</button>;
}

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const message = errors?.[field]?.[0];
  return message ? <p className="mt-1 text-sm text-[var(--danger)]">{message}</p> : null;
}

function roleLabel(role: RoleKey): string {
  return role === "BRANCH_ADMIN" ? "Branch administrator" : role === "RECEPTIONIST" ? "Receptionist" : "Trainer";
}

export function StaffForm({
  branches,
  roles,
  staff,
}: {
  branches: BranchOption[];
  roles: RoleKey[];
  staff?: EditableStaff;
}) {
  const action = staff ? updateStaffAction.bind(null, staff.id) : createStaffAction;
  const [state, formAction] = useActionState(action, initialStaffFormState);
  const inputClassName = "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm";
  const textareaClassName = "mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm";

  return (
    <form action={formAction} className="space-y-7" noValidate>
      {state.message ? <p className={`rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <section>
        <h2 className="text-base font-semibold">Account</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className="text-sm font-medium" htmlFor="name">Full name</label><input autoComplete="name" className={inputClassName} defaultValue={staff?.name} id="name" maxLength={100} name="name" required /><FieldError errors={state.fieldErrors} field="name" /></div>
          <div><label className="text-sm font-medium" htmlFor="email">Email</label><input autoComplete="email" className={inputClassName} defaultValue={staff?.email} id="email" name="email" type="email" required /><FieldError errors={state.fieldErrors} field="email" /></div>
          <div><label className="text-sm font-medium" htmlFor="phone">Phone</label><input autoComplete="tel" className={inputClassName} defaultValue={staff?.phone ?? undefined} id="phone" maxLength={30} name="phone" type="tel" /><FieldError errors={state.fieldErrors} field="phone" /></div>
          <div><label className="text-sm font-medium" htmlFor="roleKey">Role</label><select className={inputClassName} defaultValue={staff?.roleKey ?? ""} id="roleKey" name="roleKey" required><option disabled value="">Choose a role</option>{roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><FieldError errors={state.fieldErrors} field="roleKey" /></div>
        </div>
      </section>

      {!staff ? <section className="border-t pt-7"><h2 className="text-base font-semibold">Initial password</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">The staff member should change this through the password-reset flow after first sign-in.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-medium" htmlFor="password">Password</label><input autoComplete="new-password" className={inputClassName} id="password" name="password" type="password" required /><FieldError errors={state.fieldErrors} field="password" /></div><div><label className="text-sm font-medium" htmlFor="passwordConfirmation">Confirm password</label><input autoComplete="new-password" className={inputClassName} id="passwordConfirmation" name="passwordConfirmation" type="password" required /><FieldError errors={state.fieldErrors} field="passwordConfirmation" /></div></div></section> : null}

      <section className="border-t pt-7"><h2 className="text-base font-semibold">Branch assignments</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Staff can only access data for assigned branches.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{branches.map((branch) => <label className="flex items-center gap-3 rounded-lg border p-3 text-sm" key={branch.id}><input defaultChecked={staff?.branchIds.includes(branch.id) ?? branches.length === 1} name="branchIds" type="checkbox" value={branch.id} />{branch.label}</label>)}</div><FieldError errors={state.fieldErrors} field="branchIds" /></section>

      <section className="border-t pt-7"><h2 className="text-base font-semibold">Trainer profile</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">These fields are used when the staff member works as a trainer.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-medium" htmlFor="hireDate">Hire date</label><input className={inputClassName} defaultValue={staff?.hireDate ?? undefined} id="hireDate" name="hireDate" type="date" /></div><div><label className="text-sm font-medium" htmlFor="specialization">Specialization</label><input className={inputClassName} defaultValue={staff?.specialization ?? undefined} id="specialization" maxLength={200} name="specialization" /></div><div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="certifications">Certifications</label><textarea className={textareaClassName} defaultValue={staff?.certifications ?? undefined} id="certifications" maxLength={2000} name="certifications" rows={4} /></div></div></section>
      <div className="flex justify-end border-t pt-6"><SubmitButton editing={Boolean(staff)} /></div>
    </form>
  );
}
