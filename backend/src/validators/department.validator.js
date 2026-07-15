import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required.'),
  code: z.string().trim().min(1, 'Department code is required.').toUpperCase(),
  description: z.string().trim().optional(),
  managerId: z.string().regex(objectIdRegex, 'Invalid manager ID format.').optional().nullable()
});

export const updateDepartmentSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Department ID must be a valid MongoDB ObjectID.'),
  name: z.string().trim().min(1, 'Department name is required.'),
  code: z.string().trim().min(1, 'Department code is required.').toUpperCase(),
  description: z.string().trim().optional(),
  managerId: z.string().regex(objectIdRegex, 'Invalid manager ID format.').optional().nullable()
});

export const assignManagerSchema = z.object({
  managerId: z.string().regex(objectIdRegex, 'Manager ID must be a valid MongoDB ObjectID.')
});

export const addUserToDeptSchema = z.object({
  userId: z.string().regex(objectIdRegex, 'User ID must be a valid MongoDB ObjectID.'),
  roleInDepartment: z.string().trim().optional(),
  isPrimary: z.boolean().optional()
});

export const toggleDeptStatusSchema = z.object({
  status: z.boolean({ required_error: 'Status field must be a boolean.' })
});

export const deptIdParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid department ID in request path.')
});

export const deptUserParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid department ID in request path.'),
  userId: z.string().regex(objectIdRegex, 'Invalid user ID in request path.')
});
