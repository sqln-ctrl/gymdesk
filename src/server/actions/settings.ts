"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { SettingsFormState } from "@/lib/settings/form-state";
import { branchSettingsSchema, gymSettingsSchema } from "@/lib/settings/schemas";
import { updateBranchSettings, updateGymSettings } from "@/server/services/settings";

export async function updateGymSettingsAction(_previous: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  const parsed = gymSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter valid gym settings." };
  const result = await updateGymSettings(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/settings");
  return { status: "success", message: "Gym settings saved." };
}

export async function updateBranchSettingsAction(_previous: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  const parsed = branchSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter valid branch settings." };
  const result = await updateBranchSettings(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/settings");
  return { status: "success", message: "Branch settings saved." };
}
