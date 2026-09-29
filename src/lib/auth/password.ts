import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

type ParsedPasswordHash = {
  hash: Buffer;
  salt: Buffer;
};

function parsePasswordHash(value: string): ParsedPasswordHash | null {
  const [algorithm, n, r, p, salt, hash] = value.split("$");

  if (
    algorithm !== "scrypt" ||
    n !== String(SCRYPT_N) ||
    r !== String(SCRYPT_R) ||
    p !== String(SCRYPT_P) ||
    !salt ||
    !hash
  ) {
    return null;
  }

  try {
    return {
      salt: Buffer.from(salt, "base64url"),
      hash: Buffer.from(hash, "base64url"),
    };
  } catch {
    return null;
  }
}

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(encodedHash);

  if (!parsed || parsed.hash.length !== KEY_LENGTH) {
    return false;
  }

  const derivedHash = await deriveKey(password, parsed.salt);
  return timingSafeEqual(derivedHash, parsed.hash);
}
