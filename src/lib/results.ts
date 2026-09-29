export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
