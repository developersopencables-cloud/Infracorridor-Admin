/**
 * Standardized error handling utility following frontend.rules.txt
 */

import { showError } from "./toast";

export interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  statusCode?: number;
}

/**
 * Extracts a user-safe error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
 
  // console.error("[Error Handler] Full error details:", error);

  if (error instanceof Error) {
    const message = error.message;


    if (message.includes("fetch") || message.includes("network") || message.includes("Failed to fetch")) {
      return "Network error. Please check your connection and try again.";
    }

    if (message.includes("timeout") || message.includes("aborted")) {
      return "Request timed out. Please try again.";
    }

    return sanitizeErrorMessage(message);
  }

  if (typeof error === "string") {
    return sanitizeErrorMessage(error);
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Sanitizes error messages to remove technical details
 */
function sanitizeErrorMessage(message: string): string {

  const sanitized = message
    .split("\n")[0] // Take only first line
    .replace(/at\s+.*/g, "") 
    .replace(/\(.*\)/g, "") 
    .trim();

  
  const replacements: Record<string, string> = {
    "ECONNREFUSED": "Unable to connect to server",
    "ENOTFOUND": "Unable to reach server",
    "ETIMEDOUT": "Connection timed out",
    "Unexpected token": "Invalid response from server",
    "JSON.parse": "Invalid response format",
  };

  for (const [pattern, replacement] of Object.entries(replacements)) {
    if (sanitized.includes(pattern)) {
      return replacement;
    }
  }

  return sanitized || "An error occurred. Please try again.";
}

/**
 * Handles HTTP error responses with status code awareness
 */
export function handleApiError(
  response: Response,
  data?: ApiErrorResponse
): string {
  const statusCode = response.status;
  const errorMessage = data?.error || data?.message || response.statusText;

  // Log full error for debugging
  console.error(`[Error Handler] API Error ${statusCode}:`, {
    status: statusCode,
    error: errorMessage,
    data,
  });

  switch (statusCode) {
    case 400:
      return errorMessage || "Invalid request. Please check your input and try again.";
    case 401:
      if (errorMessage?.toLowerCase().includes("admin access required") ||
        errorMessage?.toLowerCase().includes("unauthorized. admin")) {
        return "Only admin can do this.";
      }
      return "You are not authorized. Please log in and try again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return errorMessage || "This resource already exists or conflicts with existing data.";
    case 422:
      return errorMessage || "Validation failed. Please check your input.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "Server error. Please try again later or contact support.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return errorMessage || `Request failed with status ${statusCode}. Please try again.`;
  }
}

/**
 * Handles fetch errors and API responses in a standardized way
 */
export async function handleFetchError(
  response: Response
): Promise<string> {
  let errorData: ApiErrorResponse | undefined;

  try {
    errorData = await response.json();
  } catch {
   
    errorData = { error: response.statusText };
  }

  return handleApiError(response, errorData);
}

/**
 * Wrapper for handling errors in try-catch blocks
 
 */
export function handleError(
  error: unknown,
  context?: string
): string {
  const errorMessage = extractErrorMessage(error);

  if (context) {
    // console.error(`[Error Handler] ${context}:`, error);
  }

  showError("Error", errorMessage);
  return errorMessage;
}

/**
 * Handles mutation errors with proper error extraction
 */
export function handleMutationError(error: unknown): string {
 
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: Response }).response;
    if (response) {
      return handleApiError(response);
    }
  }

  return extractErrorMessage(error);
}


