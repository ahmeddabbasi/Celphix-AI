function hasMessage(x: unknown): x is { message: unknown } {
  return typeof x === "object" && x !== null && "message" in x;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (hasMessage(error) && typeof error.message === "string") return error.message;
  return fallback;
}
