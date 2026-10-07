"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import type { EquipmentFormState } from "@/lib/equipment/form-state";
import { equipmentInputSchema, maintenanceInputSchema } from "@/lib/equipment/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { createEquipment, recordMaintenance } from "@/server/services/equipment";
const error = (message: string): EquipmentFormState => ({ status: "error", message });
export async function createEquipmentAction(_state: EquipmentFormState, formData: FormData): Promise<EquipmentFormState> { const actor = await getCurrentUser(); if (!actor || !hasPermission(actor, "equipment.manage")) return error("You do not have permission to manage equipment."); const parsed = equipmentInputSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return error("Enter valid equipment details."); const result = await createEquipment(actor, parsed.data); if (!result.ok) return error(result.message); revalidatePath("/equipment"); return { status: "success", message: "Equipment added." }; }
export async function recordMaintenanceAction(_state: EquipmentFormState, formData: FormData): Promise<EquipmentFormState> { const actor = await getCurrentUser(); if (!actor || !hasPermission(actor, "equipment.manage")) return error("You do not have permission to record maintenance."); const parsed = maintenanceInputSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return error("Enter valid maintenance details."); const result = await recordMaintenance(actor, parsed.data); if (!result.ok) return error(result.message); revalidatePath("/equipment"); return { status: "success", message: "Maintenance recorded." }; }
