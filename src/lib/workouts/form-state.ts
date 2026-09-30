export type WorkoutFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialWorkoutFormState: WorkoutFormState = { status: "idle" };
