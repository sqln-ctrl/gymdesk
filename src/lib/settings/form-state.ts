export type SettingsFormState = { status: "idle" | "success" | "error"; message?: string };

export const initialSettingsFormState: SettingsFormState = { status: "idle" };
