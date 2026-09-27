export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const unavailable = () =>
  new ApiError(
    503,
    "SERVICE_UNAVAILABLE",
    "This service is temporarily unavailable. Please try again.",
  );
export const unauthorized = () =>
  new ApiError(401, "AUTH_REQUIRED", "Sign in again to continue.");
export const forbidden = (
  message = "You do not have permission for this action.",
) => new ApiError(403, "FORBIDDEN", message);
