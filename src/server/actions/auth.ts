"use server";

import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit/service";
import { createPasswordResetToken, authenticateWithPassword, resetPassword } from "@/lib/auth/service";
import { bootstrapSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from "@/lib/auth/schemas";
import { createSessionForUser, destroyCurrentSession, getCurrentUser } from "@/lib/auth/session";
import type { AuthFormState } from "@/lib/auth/form-state";
import { prisma } from "@/lib/db/prisma";
import { bootstrapGym } from "@/server/services/bootstrap";

function validationError(fieldErrors: Record<string, string[] | undefined>): AuthFormState {
  return {
    status: "error",
    message: "Please correct the highlighted fields.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
    ),
  };
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const result = await authenticateWithPassword(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return {
      status: "error",
      message: "Unable to sign in with those credentials.",
    };
  }

  await createSessionForUser(result.userId);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<never> {
  const user = await getCurrentUser();
  await destroyCurrentSession();

  if (user) {
    await writeAuditLog(prisma, {
      actorUserId: user.id,
      action: "AUTH_LOGGED_OUT",
      entityType: "User",
      entityId: user.id,
    });
  }

  redirect("/login");
}

export async function bootstrapAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = bootstrapSchema.safeParse({
    gymName: formData.get("gymName"),
    branchName: formData.get("branchName"),
    branchCode: formData.get("branchCode"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const result = await bootstrapGym(parsed.data);

  if (!result.ok) {
    return {
      status: "error",
      message: "This workspace has already been initialized. Please sign in instead.",
    };
  }

  await createSessionForUser(result.userId);
  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  if (process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: "Password-reset delivery has not been configured for this environment.",
    };
  }

  const token = await createPasswordResetToken(parsed.data.email);

  return {
    status: "success",
    message: "If that account exists, a local development reset link is available below.",
    developmentResetPath: token ? `/reset-password?token=${encodeURIComponent(token)}` : undefined,
  };
}

export async function resetPasswordAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const reset = await resetPassword(parsed.data.token, parsed.data.password);

  if (!reset) {
    return {
      status: "error",
      message: "This password reset link is invalid or has expired.",
    };
  }

  redirect("/login?reset=complete");
}
