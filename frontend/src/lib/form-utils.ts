/**
 * Shared form utility functions for error parsing and validation.
 *
 * Extracted from UserFormPage, HelicopterFormPage, CrewFormPage,
 * and LandingSiteFormPage to eliminate duplicated onError logic.
 */
import { ApiError } from "@/lib/api";
import { EMAIL_REGEX } from "@/lib/constants";

/**
 * Parse API field-level validation errors from a mutation error.
 *
 * Handles FastAPI 422 responses where `detail` is a JSON array of
 * `{ loc: string[], msg: string }` items, mapping them to a flat
 * `Record<field, message>` for per-field error display.
 *
 * Falls back to raw `detail` string when the response is not a
 * validation-error array.
 */
export function parseApiFieldErrors(
  err: Error,
  defaultMessage: string
): { error: string | null; fieldErrors: Record<string, string> } {
  if (err instanceof ApiError) {
    // Try to parse validation errors from 422 response
    try {
      const detail = JSON.parse(err.detail);
      if (Array.isArray(detail)) {
        const errors: Record<string, string> = {};
        for (const item of detail) {
          const field = item.loc?.[item.loc.length - 1] ?? "unknown";
          errors[field] = item.msg ?? defaultMessage;
        }
        return { error: null, fieldErrors: errors };
      }
    } catch {
      // Not JSON array — use raw detail
    }
    return { error: err.detail, fieldErrors: {} };
  }
  return { error: err.message, fieldErrors: {} };
}

/**
 * Validate an email address against the shared EMAIL_REGEX pattern.
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
