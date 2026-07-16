import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const roleEnum = z.enum([
  'MD',
  'COO',
  'EXECUTIVE_DIRECTOR',
  'DEPARTMENT_MANAGER',
  'TEAM_LEADER',
  'STAFF',
  'INTERN',
  'admin',
  'hr',
  'employee',
  'digital_marketer',
  'student'
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Invalid email address.'),
  phone: z.string().trim().optional(),
  role: roleEnum.default('STAFF'),
  role_id: z.string().trim().optional(),
  departmentId: z.string().regex(objectIdRegex, 'Invalid department ID format.').optional().nullable(),
  designationId: z.string().regex(objectIdRegex, 'Invalid designation ID format.').optional().nullable(),
  employeeId: z.string().trim().min(3, 'Employee ID must be at least 3 characters.').optional(),
  avatar: z.string().optional().nullable(),
  password: z.string().min(8, 'Temporary password must be at least 8 characters.').optional()
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').optional(),
  phone: z.string().trim().optional(),
  departmentId: z.string().regex(objectIdRegex, 'Invalid department ID format.').optional().nullable(),
  designationId: z.string().regex(objectIdRegex, 'Invalid designation ID format.').optional().nullable(),
  avatar: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  status: z.string().trim().optional()
});
