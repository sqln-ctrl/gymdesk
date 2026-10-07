export type ProgressFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialProgressFormState: ProgressFormState = { status: "idle" };
