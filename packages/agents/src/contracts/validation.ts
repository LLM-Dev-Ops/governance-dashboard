/**
 * Common validation utilities for governance agents
 */

import { z } from 'zod';
import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of inputs for audit trail
 */
export function computeInputsHash(input: unknown): string {
  const serialized = JSON.stringify(input, Object.keys(input as object).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get current UTC timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /** UUID format */
  uuid: z.string().uuid(),

  /** ISO 8601 datetime */
  datetime: z.string().datetime(),

  /** Semantic version */
  semver: z.string().regex(/^\d+\.\d+\.\d+$/),

  /** Non-empty string */
  nonEmptyString: z.string().min(1),

  /** Positive integer */
  positiveInt: z.number().int().positive(),

  /** Non-negative number */
  nonNegativeNumber: z.number().min(0),

  /** Percentage (0-100) */
  percentage: z.number().min(0).max(100),

  /** Ratio (0-1) */
  ratio: z.number().min(0).max(1),

  /** Organization ID format */
  organizationId: z.string().regex(/^org_[a-zA-Z0-9]+$/),

  /** User ID format */
  userId: z.string().regex(/^usr_[a-zA-Z0-9]+$/),

  /** Team ID format */
  teamId: z.string().regex(/^team_[a-zA-Z0-9]+$/),
};

/**
 * Error codes for validation failures
 */
export const ValidationErrorCodes = {
  INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  INVALID_OUTPUT: 'VALIDATION_INVALID_OUTPUT',
  MISSING_REQUIRED_FIELD: 'VALIDATION_MISSING_REQUIRED',
  TYPE_MISMATCH: 'VALIDATION_TYPE_MISMATCH',
  CONSTRAINT_VIOLATION: 'VALIDATION_CONSTRAINT_VIOLATION',
  SCHEMA_VERSION_MISMATCH: 'VALIDATION_SCHEMA_VERSION_MISMATCH',
} as const;

/**
 * Create a validation error with structured details
 */
export function createValidationError(
  code: keyof typeof ValidationErrorCodes,
  message: string,
  details?: Record<string, unknown>
): Error {
  const error = new Error(message);
  error.name = 'ValidationError';
  (error as any).code = ValidationErrorCodes[code];
  (error as any).details = details;
  return error;
}

/**
 * Safe parse with error transformation
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; error: Error } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const error = createValidationError(
    'INVALID_INPUT',
    `Validation failed for ${context}: ${result.error.message}`,
    {
      issues: result.error.issues,
      context,
    }
  );

  return { success: false, error };
}
