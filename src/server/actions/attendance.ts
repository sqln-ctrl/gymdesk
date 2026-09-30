"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import type { AttendanceFormState } from "@/lib/attendance/form-state";
import { checkInInputSchema } from "@/lib/attendance/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { checkInMember } from "@/server/services/attendance";

export async function checkInMemberAction(
  _previousState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  if (!hasPermission(actor, "attendance.checkin")) return { status: "error", message: "You do not have permission to check in members." };
  const parsed = checkInInputSchema.safeParse({
    memberId: formData.get("memberId"),
    branchId: formData.get("branchId"),
    overrideReason: formData.get("overrideReason"),
    method: formData.get("method"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.flatten().formErrors[0] ?? "The check-in request is invalid." };

  const result = await checkInMember(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message, code: result.code };
  revalidatePath("/attendance");
  revalidatePath(`/members/${parsed.data.memberId}`);
  revalidatePath(`/members/${parsed.data.memberId}/attendance`);
  return {
    status: "success",
    message: result.data.overridden ? "Member checked in with an authorized override." : "Member checked in successfully.",
    checkInAt: result.data.checkInAt.toISOString(),
  };
}
