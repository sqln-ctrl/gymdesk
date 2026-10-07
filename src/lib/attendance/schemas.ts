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

export const dailyAttendanceInputSchema = z.object({
  branchId: z.string().cuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((value) => new Date(`${value}T00:00:00.000Z`)),
  entries: z.array(z.object({ memberId: z.string().cuid(), status: z.enum(["PRESENT", "ABSENT"]) })).min(1).max(500),
}).superRefine((input, context) => {
  const ids = input.entries.map((entry) => entry.memberId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["entries"], message: "Each member may appear only once." });
});

export type DailyAttendanceInput = z.infer<typeof dailyAttendanceInputSchema>;
