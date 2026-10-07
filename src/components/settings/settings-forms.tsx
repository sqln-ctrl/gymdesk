"use client";

import { useActionState } from "react";

import { initialSettingsFormState } from "@/lib/settings/form-state";
import { updateBranchSettingsAction, updateGymSettingsAction } from "@/server/actions/settings";

const field = "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm";

type Gym = {
  id: string;
  name: string;
  logoUrl: string | null;
  currency: string;
  timezone: string;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
};

function FormMessage({ message, status }: { message?: string; status: "idle" | "success" | "error" }) {
  if (!message) return null;
  return <p className={`text-sm ${status === "error" ? "text-[var(--danger)]" : "text-emerald-700"}`} role="status">{message}</p>;
}

export function GymSettingsForm({ gym }: { gym: Gym }) {
  const [state, action, pending] = useActionState(updateGymSettingsAction, initialSettingsFormState);

  return <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
    <input name="gymId" type="hidden" value={gym.id} />
    <label className="text-sm font-medium sm:col-span-2">Gym name<input className={field} defaultValue={gym.name} maxLength={120} name="name" required /></label>
    <label className="text-sm font-medium sm:col-span-2">Logo image URL<input className={field} defaultValue={gym.logoUrl ?? ""} maxLength={500} name="logoUrl" placeholder="https://example.com/logo.png" type="url" /></label>
    <label className="text-sm font-medium">Currency<input className={field} defaultValue={gym.currency} maxLength={3} name="currency" pattern="[A-Za-z]{3}" required /></label>
    <label className="text-sm font-medium">Time zone<input className={field} defaultValue={gym.timezone} maxLength={100} name="timezone" placeholder="Asia/Karachi" required /></label>
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className="h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving..." : "Save gym settings"}</button><FormMessage message={state.message} status={state.status} /></div>
  </form>;
}

export function BranchSettingsForm({ branch }: { branch: Branch }) {
  const [state, action, pending] = useActionState(updateBranchSettingsAction, initialSettingsFormState);

  return <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
    <input name="branchId" type="hidden" value={branch.id} />
    <label className="text-sm font-medium">Branch name<input className={field} defaultValue={branch.name} maxLength={120} name="name" required /></label>
    <label className="text-sm font-medium">Branch code<input className={`${field} cursor-not-allowed bg-[var(--surface-muted)]`} defaultValue={branch.code} disabled readOnly /></label>
    <label className="text-sm font-medium">Phone<input className={field} defaultValue={branch.phone ?? ""} maxLength={30} name="phone" type="tel" /></label>
    <label className="text-sm font-medium">Email<input className={field} defaultValue={branch.email ?? ""} maxLength={320} name="email" type="email" /></label>
    <label className="text-sm font-medium sm:col-span-2">Address<textarea className="mt-1 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm" defaultValue={branch.address ?? ""} maxLength={500} name="address" /></label>
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className="h-10 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50" disabled={pending} type="submit">{pending ? "Saving..." : "Save branch settings"}</button><FormMessage message={state.message} status={state.status} /></div>
  </form>;
}
