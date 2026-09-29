import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashLoginSubject(email: string): string {
  return createHash("sha256").update(email).digest("base64url");
}

export async function isLoginAllowed(email: string): Promise<boolean> {
  const throttle = await prisma.loginThrottle.findUnique({
    where: { subjectHash: hashLoginSubject(email) },
    select: { lockedUntil: true },
  });

  return !throttle?.lockedUntil || throttle.lockedUntil <= new Date();
}

export async function recordFailedLogin(email: string): Promise<void> {
  const subjectHash = hashLoginSubject(email);
  const now = new Date();
  const existing = await prisma.loginThrottle.findUnique({ where: { subjectHash } });

  if (!existing || now.getTime() - existing.windowStartedAt.getTime() > ATTEMPT_WINDOW_MS) {
    await prisma.loginThrottle.upsert({
      where: { subjectHash },
      create: { subjectHash, attempts: 1, windowStartedAt: now },
      update: { attempts: 1, windowStartedAt: now, lockedUntil: null },
    });
    return;
  }

  const attempts = existing.attempts + 1;
  await prisma.loginThrottle.update({
    where: { subjectHash },
    data: {
      attempts,
      lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + ATTEMPT_WINDOW_MS) : null,
    },
  });
}

export async function clearLoginThrottle(email: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({
    where: { subjectHash: hashLoginSubject(email) },
  });
}
