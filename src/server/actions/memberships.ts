"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import type { MembershipFormState } from "@/lib/memberships/form-state";
import {
  membershipCancellationSchema,
  membershipExpiryOverrideSchema,
  membershipFreezeInputSchema,
  membershipPlanInputSchema,
  sellMembershipInputSchema,
} from "@/lib/memberships/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import {
  cancelMembership,
  createMembershipPlan,
  freezeMembership,
  overrideMembershipExpiry,
  renewMembership,
  sellMembership,
  setMembershipPlanActive,
  unfreezeMembership,
  updateMembershipPlan,
} from "@/server/services/memberships";

function sessionError(): MembershipFormState {
  return { status: "error", message: "Your session has expired. Sign in again to continue." };
}

function validationError(fieldErrors: Record<string, string[] | undefined>): MembershipFormState {
  return {
    status: "error",
    message: "Please correct the highlighted fields.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
    ),
  };
}

function planValues(formData: FormData) {
  return {
    gymId: formData.get("gymId"), name: formData.get("name"), description: formData.get("description"),
    durationValue: formData.get("durationValue"), durationUnit: formData.get("durationUnit"),
    priceMinor: formData.get("priceMinor"), registrationFeeMinor: formData.get("registrationFeeMinor"),
    taxRateBasisPoints: formData.get("taxRateBasisPoints"), freezeDaysAllowed: formData.get("freezeDaysAllowed"), graceDays: formData.get("graceDays"),
  };
}

export async function createMembershipPlanAction(_previousState: MembershipFormState, formData: FormData): Promise<MembershipFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.plan.manage")) return { status: "error", message: "You do not have permission to manage membership plans." };
  const parsed = membershipPlanInputSchema.safeParse(planValues(formData));
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await createMembershipPlan(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/memberships");
  revalidatePath("/memberships/plans");
  redirect("/memberships/plans");
}

export async function updateMembershipPlanAction(planId: string, _previousState: MembershipFormState, formData: FormData): Promise<MembershipFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.plan.manage")) return { status: "error", message: "You do not have permission to manage membership plans." };
  if (!z.string().cuid().safeParse(planId).success) return { status: "error", message: "The selected membership plan is invalid." };
  const parsed = membershipPlanInputSchema.safeParse(planValues(formData));
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await updateMembershipPlan(actor, planId, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/memberships");
  revalidatePath("/memberships/plans");
  redirect("/memberships/plans");
}

export async function setMembershipPlanActiveAction(planId: string, isActive: boolean, _previousState: MembershipFormState, _formData: FormData): Promise<MembershipFormState> {
  void _previousState;
  void _formData;
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.plan.manage")) return { status: "error", message: "You do not have permission to manage membership plans." };
  if (!z.string().cuid().safeParse(planId).success) return { status: "error", message: "The selected membership plan is invalid." };
  const result = await setMembershipPlanActive(actor, planId, isActive);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/memberships");
  revalidatePath("/memberships/plans");
  return { status: "idle" };
}

export async function sellMembershipAction(memberId: string, _previousState: MembershipFormState, formData: FormData): Promise<MembershipFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.sell")) return { status: "error", message: "You do not have permission to sell memberships." };
  const parsed = sellMembershipInputSchema.safeParse({
    memberId,
    branchId: formData.get("branchId"),
    planId: formData.get("planId"),
    startDate: formData.get("startDate"),
    discountMinor: formData.get("discountMinor"),
  });
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await sellMembership(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/memberships");
  revalidatePath(`/members/${memberId}`);
  redirect(`/invoices/${result.data.invoiceId}`);
}

export async function renewMembershipAction(memberId: string, membershipId: string, _previousState: MembershipFormState, _formData: FormData): Promise<MembershipFormState> {
  void _previousState;
  void _formData;
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.sell")) return { status: "error", message: "You do not have permission to renew memberships." };
  if (!z.string().cuid().safeParse(memberId).success || !z.string().cuid().safeParse(membershipId).success) return { status: "error", message: "The selected membership is invalid." };
  const result = await renewMembership(actor, membershipId);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/memberships");
  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members/${memberId}/memberships`);
  return { status: "idle" };
}

function validMembershipRefs(memberId: string, membershipId: string): boolean {
  return z.string().cuid().safeParse(memberId).success && z.string().cuid().safeParse(membershipId).success;
}

function revalidateMembership(memberId: string): void {
  revalidatePath("/memberships");
  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members/${memberId}/memberships`);
}

export async function freezeMembershipAction(memberId: string, membershipId: string, _previousState: MembershipFormState, formData: FormData): Promise<MembershipFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.sell")) return { status: "error", message: "You do not have permission to freeze memberships." };
  if (!validMembershipRefs(memberId, membershipId)) return { status: "error", message: "The selected membership is invalid." };
  const parsed = membershipFreezeInputSchema.safeParse({ startDate: formData.get("startDate"), endDate: formData.get("endDate"), reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await freezeMembership(actor, membershipId, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateMembership(memberId);
  return { status: "idle" };
}

export async function unfreezeMembershipAction(memberId: string, membershipId: string, _previousState: MembershipFormState, _formData: FormData): Promise<MembershipFormState> {
  void _previousState;
  void _formData;
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.sell")) return { status: "error", message: "You do not have permission to unfreeze memberships." };
  if (!validMembershipRefs(memberId, membershipId)) return { status: "error", message: "The selected membership is invalid." };
  const result = await unfreezeMembership(actor, membershipId);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateMembership(memberId);
  return { status: "idle" };
}

export async function cancelMembershipAction(memberId: string, membershipId: string, _previousState: MembershipFormState, formData: FormData): Promise<MembershipFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.sell")) return { status: "error", message: "You do not have permission to cancel memberships." };
  if (!validMembershipRefs(memberId, membershipId)) return { status: "error", message: "The selected membership is invalid." };
  const parsed = membershipCancellationSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await cancelMembership(actor, membershipId, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateMembership(memberId);
  return { status: "idle" };
}

export async function overrideMembershipExpiryAction(memberId: string, membershipId: string, _previousState: MembershipFormState, formData: FormData): Promise<MembershipFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "membership.override")) return { status: "error", message: "You do not have permission to override membership expiry." };
  if (!validMembershipRefs(memberId, membershipId)) return { status: "error", message: "The selected membership is invalid." };
  const parsed = membershipExpiryOverrideSchema.safeParse({ endDate: formData.get("endDate"), reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors);
  const result = await overrideMembershipExpiry(actor, membershipId, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidateMembership(memberId);
  return { status: "idle" };
}
