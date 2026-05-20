import { z } from 'zod';

const passwordComplexity = z.string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special symbol.');

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is a required field.')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address format.')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Password reset token is required.'),
  newPassword: passwordComplexity
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordComplexity
});
