export type AttendanceFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  code?: string;
  checkInAt?: string;
};

export const initialAttendanceFormState: AttendanceFormState = { status: "idle" };
