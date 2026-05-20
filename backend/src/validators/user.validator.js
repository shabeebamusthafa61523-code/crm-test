import { z } from 'zod';

const roleEnum = z.enum([
  'MD',
  'COO',
  'EXECUTIVE_DIRECTOR',
  'DEPARTMENT_MANAGER',
  'TEAM_LEADER',
  'STAFF',
  'INTERN'
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Invalid email address.'),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (must be international standard e.g. +919999988888).'),
  role: roleEnum.default('STAFF'),
  departmentId: z.string().uuid('Invalid department ID format.').optional().nullable(),
  employeeId: z.string().trim().min(3, 'Employee ID must be at least 3 characters.'),
  avatar: z.string().url('Invalid URL format for avatar.').optional().nullable(),
  password: z.string().min(8, 'Temporary password must be at least 8 characters.').optional()
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').optional(),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format.').optional(),
  departmentId: z.string().uuid().optional().nullable(),
  avatar: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});
