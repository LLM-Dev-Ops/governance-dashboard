import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Registration form validation schema
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    department: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * Policy validation schema
 */
export const policySchema = z.object({
  name: z.string().min(3, 'Policy name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  is_active: z.boolean().default(true),
  applies_to: z.array(z.string()).min(1, 'At least one target is required'),
});

/**
 * Budget validation schema
 */
export const budgetSchema = z.object({
  name: z.string().min(3, 'Budget name must be at least 3 characters'),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  applies_to: z.enum(['global', 'user', 'department', 'project']),
  target_id: z.string().optional(),
  alert_threshold: z.number().min(0).max(100, 'Threshold must be between 0 and 100'),
});

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get password strength score (0-4)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
