import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { readProgressPhoto } from "@/lib/storage/progress-photo";
import { getProgressPhotoForAccess } from "@/server/services/progress";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ photoId: string }> };

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const actor = await getCurrentUser();
  const { photoId } = await params;
  if (!actor || !z.string().cuid().safeParse(photoId).success) return new Response(null, { status: 404 });

  const photo = await getProgressPhotoForAccess(actor, photoId);
  if (!photo) return new Response(null, { status: 404 });
  const bytes = await readProgressPhoto(photo.storageKey);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(bytes, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": photo.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
