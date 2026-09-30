export type StaffFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialStaffFormState: StaffFormState = { status: "idle" };
