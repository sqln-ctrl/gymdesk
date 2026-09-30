import { z } from "zod";

export const checkInInputSchema = z.object({
  memberId: z.string().cuid(),
  branchId: z.string().cuid(),
  overrideReason: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(3, "Provide a reason with at least 3 characters.").max(500).optional(),
  ),
  method: z.enum(["SEARCH", "SCANNER", "QR"]).default("SEARCH"),
});

export type CheckInInput = z.infer<typeof checkInInputSchema>;
