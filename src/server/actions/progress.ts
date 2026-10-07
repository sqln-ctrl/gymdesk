"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import type { ProgressFormState } from "@/lib/progress/form-state";
import { progressEntryInputSchema } from "@/lib/progress/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { removeStoredProgressPhoto, storeProgressPhoto } from "@/lib/storage/progress-photo";
import { createProgressEntry } from "@/server/services/progress";

function validationError(fieldErrors: Record<string, string[] | undefined>): ProgressFormState {
  return {
    status: "error",
    message: "Please correct the progress entry.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
    ),
  };
}

export async function createProgressEntryAction(
  memberId: string,
  _previousState: ProgressFormState,
  formData: FormData,
): Promise<ProgressFormState> {
  void _previousState;
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  if (!hasPermission(actor, "progress.manage")) return { status: "error", message: "You do not have permission to record member progress." };
  if (!z.string().cuid().safeParse(memberId).success) return { status: "error", message: "The selected member is invalid." };

  const parsed = progressEntryInputSchema.safeParse({
    recordedAt: formData.get("recordedAt"),
    weightKg: formData.get("weightKg"),
    bodyFatPercent: formData.get("bodyFatPercent"),
    chestCm: formData.get("chestCm"),
    waistCm: formData.get("waistCm"),
    hipsCm: formData.get("hipsCm"),
    armsCm: formData.get("armsCm"),
    thighsCm: formData.get("thighsCm"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);

  const rawPhoto = formData.get("photo");
  const stored = rawPhoto instanceof File && rawPhoto.size > 0 ? await storeProgressPhoto(rawPhoto) : undefined;
  if (stored && !stored.ok) return { status: "error", message: stored.message };

  const result = await createProgressEntry(actor, memberId, parsed.data, stored?.data);
  if (!result.ok) {
    if (stored?.ok) await removeStoredProgressPhoto(stored.data.storageKey);
    return { status: "error", message: result.message };
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members/${memberId}/progress`);
  return { status: "success", message: stored?.ok ? "Progress entry and private photo saved." : "Progress entry saved." };
}
