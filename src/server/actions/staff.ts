"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import type { StaffFormState } from "@/lib/staff/form-state";
import { createStaffInputSchema, updateStaffInputSchema } from "@/lib/staff/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { createStaff, setStaffStatus, updateStaff } from "@/server/services/staff";

function values(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    roleKey: formData.get("roleKey"),
    branchIds: formData.getAll("branchIds"),
    hireDate: formData.get("hireDate"),
    specialization: formData.get("specialization"),
    certifications: formData.get("certifications"),
  };
}

function validationError(fieldErrors: Record<string, string[] | undefined>): StaffFormState {
  return {
    status: "error",
    message: "Please correct the highlighted fields.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
    ),
  };
}

function revalidateStaff(staffId?: string): void {
  revalidatePath("/staff");
  if (staffId) revalidatePath(`/staff/${staffId}`);
  revalidatePath("/members");
}

export async function createStaffAction(
  _previousState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  if (!hasPermission(actor, "staff.manage")) return { status: "error", message: "You do not have permission to manage staff." };
  const parsed = createStaffInputSchema.safeParse({
    ...values(formData),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await createStaff(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateStaff(result.data.staffId);
  return { status: "success", message: "Staff account created." };
}

export async function updateStaffAction(
  staffId: string,
  _previousState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  if (!hasPermission(actor, "staff.manage") || !z.string().cuid().safeParse(staffId).success) {
    return { status: "error", message: "You do not have permission to update this staff account." };
  }
  const parsed = updateStaffInputSchema.safeParse(values(formData));
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await updateStaff(actor, staffId, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateStaff(staffId);
  return { status: "success", message: "Staff profile updated." };
}

export async function setStaffStatusAction(
  staffId: string,
  status: "ACTIVE" | "INACTIVE",
  _previousState: StaffFormState,
  _formData: FormData,
): Promise<StaffFormState> {
  void _previousState;
  void _formData;
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "Your session has expired. Sign in again to continue." };
  if (!hasPermission(actor, "staff.manage") || !z.string().cuid().safeParse(staffId).success) {
    return { status: "error", message: "You do not have permission to update this staff account." };
  }
  const result = await setStaffStatus(actor, staffId, status);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateStaff(staffId);
  return { status: "success", message: status === "ACTIVE" ? "Staff account reactivated." : "Staff account deactivated." };
}
