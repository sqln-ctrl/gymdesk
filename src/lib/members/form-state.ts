export type MemberFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialMemberFormState: MemberFormState = { status: "idle" };
