export type BillingFormState = {
  status?: "idle" | "success" | "error";
  message?: string;
};

export const initialBillingFormState: BillingFormState = { status: "idle" };
