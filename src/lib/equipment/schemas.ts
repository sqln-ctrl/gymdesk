import { z } from "zod";

const optionalText = (max: number) => z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(max).optional());
const optionalDate = z.preprocess((value) => typeof value === "string" && value ? new Date(`${value}T00:00:00.000Z`) : undefined, z.date().optional());

export const equipmentInputSchema = z.object({ branchId: z.string().cuid(), assetCode: z.string().trim().min(2).max(50), name: z.string().trim().min(2).max(120), category: optionalText(100), location: optionalText(100), purchaseDate: optionalDate, warrantyEndsAt: optionalDate, nextServiceAt: optionalDate });
export const maintenanceInputSchema = z.object({ equipmentId: z.string().cuid(), servicedAt: z.preprocess((value) => typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value, z.date()), serviceType: z.string().trim().min(2).max(120), vendor: optionalText(120), costMinor: z.coerce.number().int().min(0).max(100_000_000), notes: optionalText(2_000), nextDueAt: optionalDate });
export type EquipmentInput = z.infer<typeof equipmentInputSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceInputSchema>;
