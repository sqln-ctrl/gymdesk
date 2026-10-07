export type ClassFormState = { status: "idle" | "success" | "error"; message?: string };

export const initialClassFormState: ClassFormState = { status: "idle" };
