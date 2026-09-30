const MEMBER_QR_PREFIX = "gymflow:member:";

export function memberQrPayload(memberId: string): string {
  return `${MEMBER_QR_PREFIX}${memberId}`;
}

export function memberIdFromQrPayload(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith(MEMBER_QR_PREFIX)) return null;

  const memberId = normalized.slice(MEMBER_QR_PREFIX.length);
  return /^c[a-z0-9]{24,}$/i.test(memberId) ? memberId : null;
}
