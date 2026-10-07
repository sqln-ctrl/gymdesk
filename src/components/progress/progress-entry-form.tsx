"use client";

import { useActionState } from "react";

import { initialProgressFormState } from "@/lib/progress/form-state";
import { createProgressEntryAction } from "@/server/actions/progress";

type Field = {
  name: "weightKg" | "bodyFatPercent" | "chestCm" | "waistCm" | "hipsCm" | "armsCm" | "thighsCm";
  label: string;
  step: string;
  min: number;
  max: number;
};

const fields: Field[] = [
  { name: "weightKg", label: "Weight (kg)", step: "0.1", min: 10, max: 500 },
  { name: "bodyFatPercent", label: "Body fat (%)", step: "0.1", min: 0, max: 100 },
  { name: "chestCm", label: "Chest (cm)", step: "0.1", min: 1, max: 500 },
  { name: "waistCm", label: "Waist (cm)", step: "0.1", min: 1, max: 500 },
  { name: "hipsCm", label: "Hips (cm)", step: "0.1", min: 1, max: 500 },
  { name: "armsCm", label: "Arms (cm)", step: "0.1", min: 1, max: 250 },
  { name: "thighsCm", label: "Thighs (cm)", step: "0.1", min: 1, max: 300 },
];

export function ProgressEntryForm({ memberId, today }: { memberId: string; today: string }) {
  const action = createProgressEntryAction.bind(null, memberId);
  const [state, formAction, isPending] = useActionState(action, initialProgressFormState);
  const inputClassName = "mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm";

  return (
    <form action={formAction} className="mt-4 space-y-4">
      {state.message ? (
        <p aria-live="polite" className={`rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-sm font-medium" htmlFor="recordedAt">Recorded date</label>
          <input className={inputClassName} defaultValue={today} id="recordedAt" name="recordedAt" required type="date" />
        </div>
        {fields.map((field) => (
          <div key={field.name}>
            <label className="text-sm font-medium" htmlFor={field.name}>{field.label}</label>
            <input className={inputClassName} id={field.name} max={field.max} min={field.min} name={field.name} step={field.step} type="number" />
          </div>
        ))}
      </div>
      {state.fieldErrors?.weightKg?.[0] ? <p className="text-sm text-[var(--danger)]">{state.fieldErrors.weightKg[0]}</p> : null}
      <div>
        <label className="text-sm font-medium" htmlFor="notes">Trainer notes</label>
        <textarea className="mt-1 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm" id="notes" maxLength={2000} name="notes" placeholder="Observations, goals, or changes since the last check-in" />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="photo">Optional progress photo</label>
        <input accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--brand)]" id="photo" name="photo" type="file" />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">JPEG, PNG, or WebP up to 900 KB. It is stored privately and is available only to authorized staff.</p>
      </div>
      <button className="h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Save progress entry"}
      </button>
    </form>
  );
}
