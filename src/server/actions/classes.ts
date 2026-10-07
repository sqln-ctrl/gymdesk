"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { initialClassFormState, type ClassFormState } from "@/lib/classes/form-state";
import { attendanceInputSchema, classBookingInputSchema, fitnessClassInputSchema } from "@/lib/classes/schemas";
import { hasPermission } from "@/lib/permissions/policy";
import { bookMemberIntoClass, cancelClassBooking, createFitnessClass, recordClassAttendance } from "@/server/services/classes";

function sessionError(): ClassFormState { return { status: "error", message: "Your session has expired. Sign in again to continue." }; }
function invalid(): ClassFormState { return { status: "error", message: "Enter valid class details." }; }

export async function createFitnessClassAction(_previous: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "class.manage")) return { status: "error", message: "You do not have permission to manage classes." };
  const parsed = fitnessClassInputSchema.safeParse({ branchId: formData.get("branchId"), trainerId: formData.get("trainerId"), name: formData.get("name"), description: formData.get("description"), room: formData.get("room"), defaultCapacity: formData.get("defaultCapacity"), defaultDurationMinutes: formData.get("defaultDurationMinutes"), firstSessionAt: formData.get("firstSessionAt"), occurrences: formData.get("occurrences"), repeatEveryDays: formData.get("repeatEveryDays") });
  if (!parsed.success) return invalid();
  const result = await createFitnessClass(actor, parsed.data);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/classes");
  return { status: "success", message: `Class created with ${result.data.sessionCount} scheduled sessions.` };
}

export async function bookMemberIntoClassAction(_previous: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!hasPermission(actor, "class.book") && !hasPermission(actor, "class.manage")) return { status: "error", message: "You do not have permission to book classes." };
  const parsed = classBookingInputSchema.safeParse({ sessionId: formData.get("sessionId"), memberId: formData.get("memberId") });
  if (!parsed.success) return invalid();
  const result = await bookMemberIntoClass(actor, parsed.data.sessionId, parsed.data.memberId);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/classes");
  return { status: "success", message: result.data.status === "BOOKED" ? "Class place reserved." : "Class is full; member was added to the waitlist." };
}

export async function cancelClassBookingAction(bookingId: string, _previous: ClassFormState, _formData: FormData): Promise<ClassFormState> {
  void _previous; void _formData;
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  if (!z.string().cuid().safeParse(bookingId).success) return invalid();
  const result = await cancelClassBooking(actor, bookingId);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/classes");
  return { status: "success", message: "Booking cancelled. The next waitlisted member was promoted when applicable." };
}

export async function recordClassAttendanceAction(bookingId: string, status: "ATTENDED" | "NO_SHOW", _previous: ClassFormState, _formData: FormData): Promise<ClassFormState> {
  void _previous; void _formData;
  const actor = await getCurrentUser();
  if (!actor) return sessionError();
  const parsed = attendanceInputSchema.safeParse({ bookingId, status });
  if (!parsed.success) return invalid();
  const result = await recordClassAttendance(actor, parsed.data.bookingId, parsed.data.status);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/classes");
  return { status: "success", message: "Class attendance updated." };
}

export { initialClassFormState };
