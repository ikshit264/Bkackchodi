import { NextResponse } from "next/server";

export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Standardized error response helper
 */
export function createErrorResponse(
  error: string,
  status: number,
  code?: string,
  details?: string
): NextResponse<ApiError> {
  const response: ApiError = { error };
  if (code) response.code = code;
  if (details) response.details = details;

  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  UNAUTHORIZED: () => createErrorResponse("Unauthorized", 401, "UNAUTHORIZED"),
  FORBIDDEN: (message = "Forbidden") => createErrorResponse(message, 403, "FORBIDDEN"),
  NOT_FOUND: (resource = "Resource") => createErrorResponse(`${resource} not found`, 404, "NOT_FOUND"),
  VALIDATION_ERROR: (details: string) => createErrorResponse("Validation failed", 400, "VALIDATION_ERROR", details),
  CONFLICT: (message: string) => createErrorResponse(message, 409, "CONFLICT"),
  INTERNAL_ERROR: () => createErrorResponse("Internal Server Error", 500, "INTERNAL_ERROR"),
  BAD_REQUEST: (message: string) => createErrorResponse(message, 400, "BAD_REQUEST"),
};




