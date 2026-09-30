export type MembershipFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialMembershipFormState: MembershipFormState = { status: "idle" };
