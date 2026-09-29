import "server-only";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/service";
import { clearLoginThrottle, isLoginAllowed, recordFailedLogin } from "@/lib/auth/login-throttle";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth/tokens";

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

export type AuthenticationResult =
  | { ok: true; userId: string }
  | { ok: false; code: "INVALID_CREDENTIALS" | "LOGIN_THROTTLED" };

export async function authenticateWithPassword(
  email: string,
  password: string,
): Promise<AuthenticationResult> {
  if (!(await isLoginAllowed(email))) {
    return { ok: false, code: "LOGIN_THROTTLED" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, status: true },
  });

  if (!user?.passwordHash || user.status !== "ACTIVE") {
    await recordFailedLogin(email);
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    await recordFailedLogin(email);
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  await clearLoginThrottle(email);
  await writeAuditLog(prisma, {
    actorUserId: user.id,
    action: "AUTH_LOGIN_SUCCEEDED",
    entityType: "User",
    entityId: user.id,
  });

  return { ok: true, userId: user.id };
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS);

  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await transaction.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashOpaqueToken(token), expiresAt },
    });
    await writeAuditLog(transaction, {
      actorUserId: user.id,
      action: "AUTH_PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
    });
  });

  return token;
}

export async function resetPassword(token: string, password: string): Promise<boolean> {
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      return false;
    }

    const consumed = await transaction.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null },
      data: { usedAt: now },
    });

    if (consumed.count !== 1) {
      return false;
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(password) },
    });
    await transaction.userSession.deleteMany({ where: { userId: resetToken.userId } });
    await writeAuditLog(transaction, {
      actorUserId: resetToken.userId,
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: resetToken.userId,
    });

    return true;
  });
}
