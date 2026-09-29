import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_AVATAR_BYTES = 900 * 1024;

type AvatarFormat = { extension: "jpg" | "png" | "webp"; mimeType: string };

function detectAvatarFormat(bytes: Uint8Array): AvatarFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}

export async function storeMemberAvatar(
  memberId: string,
  file: File,
): Promise<{ ok: true; url: string; mimeType: string } | { ok: false; message: string }> {
  if (file.size === 0) {
    return { ok: false, message: "Choose an image to upload." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Avatar images must be 900 KB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectAvatarFormat(bytes);
  if (!format) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image." };
  }

  const relativeDirectory = path.join("uploads", "members", memberId);
  const targetDirectory = path.join(process.cwd(), "public", relativeDirectory);
  const filename = `${randomUUID()}.${format.extension}`;
  await mkdir(targetDirectory, { recursive: true });
  await writeFile(path.join(targetDirectory, filename), bytes, { flag: "wx" });

  return {
    ok: true,
    url: `/${relativeDirectory.replaceAll(path.sep, "/")}/${filename}`,
    mimeType: format.mimeType,
  };
}
