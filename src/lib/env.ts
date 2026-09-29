import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
});

export const serverEnv = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});

export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "GymFlow",
} as const;
