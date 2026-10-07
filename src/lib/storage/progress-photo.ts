import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_PROGRESS_PHOTO_BYTES = 900 * 1024;
const STORAGE_KEY_PATTERN = /^progress\/[a-f0-9-]+\.(jpg|png|webp)$/;

type ImageFormat = { extension: "jpg" | "png" | "webp"; mimeType: string };

export type StoredProgressPhoto = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (
    bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }
  return null;
}

function privateUploadsRoot(): string {
  return path.resolve(process.cwd(), "uploads", "private");
}

function resolveStorageKey(storageKey: string): string | null {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) return null;
  const root = privateUploadsRoot();
  const target = path.resolve(root, storageKey);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

export async function storeProgressPhoto(file: File): Promise<{ ok: true; data: StoredProgressPhoto } | { ok: false; message: string }> {
  if (file.size > MAX_PROGRESS_PHOTO_BYTES) {
    return { ok: false, message: "Progress photos must be 900 KB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectImageFormat(bytes);
  if (!format) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP photo." };
  }

  const storageKey = `progress/${randomUUID()}.${format.extension}`;
  const target = resolveStorageKey(storageKey);
  if (!target) {
    return { ok: false, message: "Unable to prepare the progress photo." };
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return { ok: true, data: { storageKey, mimeType: format.mimeType, sizeBytes: bytes.length } };
}

export async function readProgressPhoto(storageKey: string): Promise<Uint8Array | null> {
  const target = resolveStorageKey(storageKey);
  if (!target) return null;
  try {
    return await readFile(/* turbopackIgnore: true */ target);
  } catch {
    return null;
  }
}

export async function removeStoredProgressPhoto(storageKey: string): Promise<void> {
  const target = resolveStorageKey(storageKey);
  if (!target) return;
  try {
    await unlink(target);
  } catch {
    // A failed cleanup must not hide the original submission error.
  }
}
