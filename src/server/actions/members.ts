"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import type { MemberFormState } from "@/lib/members/form-state";
import { memberInputSchema } from "@/lib/members/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { storeMemberAvatar } from "@/lib/storage/member-avatar";
import {
  changeMemberStatus,
  createMember,
  importMembers,
  updateMember,
  updateMemberAvatar,
} from "@/server/services/members";

const importRowsSchema = z.array(
  z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    dateOfBirth: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
).min(1).max(200);

function validationError(fieldErrors: Record<string, string[] | undefined>): MemberFormState {
  return {
    status: "error",
    message: "Please correct the highlighted fields.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
    ),
  };
}

function sessionError(): MemberFormState {
  return { status: "error", message: "Your session has expired. Sign in again to continue." };
}

function formValues(formData: FormData) {
  return {
    primaryBranchId: formData.get("primaryBranchId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    address: formData.get("address"),
    assignedTrainerId: formData.get("assignedTrainerId"),
    notes: formData.get("notes"),
  };
}

function isValidMemberId(memberId: string): boolean {
  return z.string().cuid().safeParse(memberId).success;
}

export async function createMemberAction(
  _previousState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const actor = await getCurrentUser();
  if (!actor) {
    return sessionError();
  }
  if (!hasPermission(actor, "member.create")) {
    return { status: "error", message: "You do not have permission to create members." };
  }

  const parsed = memberInputSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const result = await createMember(actor, parsed.data);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/members");
  redirect(`/members/${result.memberId}`);
}

export async function updateMemberAction(
  memberId: string,
  _previousState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const actor = await getCurrentUser();
  if (!actor) {
    return sessionError();
  }
  if (!hasPermission(actor, "member.update")) {
    return { status: "error", message: "You do not have permission to update members." };
  }
  if (!isValidMemberId(memberId)) {
    return { status: "error", message: "The selected member is invalid." };
  }

  const parsed = memberInputSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const result = await updateMember(actor, memberId, parsed.data);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  redirect(`/members/${memberId}`);
}

export async function changeMemberStatusAction(
  memberId: string,
  status: "ACTIVE" | "ARCHIVED",
  _previousState: MemberFormState,
  _formData: FormData,
): Promise<MemberFormState> {
  void _previousState;
  void _formData;

  const actor = await getCurrentUser();
  if (!actor) {
    return sessionError();
  }
  if (!hasPermission(actor, "member.archive")) {
    return { status: "error", message: "You do not have permission to change this member's status." };
  }
  if (!isValidMemberId(memberId) || (status !== "ACTIVE" && status !== "ARCHIVED")) {
    return { status: "error", message: "The requested status change is invalid." };
  }

  const result = await changeMemberStatus(actor, memberId, status);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  return { status: "idle" };
}

export async function uploadMemberAvatarAction(
  memberId: string,
  _previousState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  void _previousState;

  const actor = await getCurrentUser();
  if (!actor) {
    return sessionError();
  }
  if (!hasPermission(actor, "member.update")) {
    return { status: "error", message: "You do not have permission to update member profiles." };
  }
  if (!isValidMemberId(memberId)) {
    return { status: "error", message: "The selected member is invalid." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { status: "error", message: "Choose an image to upload." };
  }

  const stored = await storeMemberAvatar(memberId, file);
  if (!stored.ok) {
    return { status: "error", message: stored.message };
  }
  const result = await updateMemberAvatar(actor, memberId, stored.url);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath(`/members/${memberId}`);
  return { status: "idle" };
}

export async function importMembersAction(
  _previousState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const actor = await getCurrentUser();
  if (!actor) {
    return sessionError();
  }
  if (!hasPermission(actor, "member.create")) {
    return { status: "error", message: "You do not have permission to import members." };
  }

  const branchId = formData.get("primaryBranchId");
  const rawRows = formData.get("rowsJson");
  if (typeof branchId !== "string" || branchId.length === 0 || typeof rawRows !== "string" || rawRows.length > 100_000) {
    return { status: "error", message: "Choose a branch and upload a CSV of at most 200 rows." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawRows);
  } catch {
    return { status: "error", message: "The prepared CSV rows could not be read. Upload the file again." };
  }

  const parsedRows = importRowsSchema.safeParse(parsedJson);
  if (!parsedRows.success) {
    return { status: "error", message: "The CSV must contain 1 to 200 well-formed rows." };
  }

  const members = [];
  for (const [index, row] of parsedRows.data.entries()) {
    const parsedMember = memberInputSchema.safeParse({
      primaryBranchId: branchId,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone ?? "",
      email: row.email ?? "",
      dateOfBirth: row.dateOfBirth ?? "",
      emergencyContactName: row.emergencyContactName ?? "",
      emergencyContactPhone: row.emergencyContactPhone ?? "",
      address: row.address ?? "",
      assignedTrainerId: "",
      notes: row.notes ?? "",
    });
    if (!parsedMember.success) {
      const firstError = Object.values(parsedMember.error.flatten().fieldErrors).flat()[0];
      return { status: "error", message: `Row ${index + 2}: ${firstError ?? "contains invalid data."}` };
    }
    members.push(parsedMember.data);
  }

  const result = await importMembers(actor, { branchId, members });
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/members");
  redirect(`/members?imported=${result.count}`);
}
