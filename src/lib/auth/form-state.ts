export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  developmentResetPath?: string;
};

export const initialAuthFormState: AuthFormState = { status: "idle" };
