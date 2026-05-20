import { z } from 'zod';

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const statusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Task title must be at least 3 characters.'),
  description: z.string().trim().optional().nullable(),
  priority: priorityEnum.default('MEDIUM'),
  status: statusEnum.default('PENDING'),
  deadline: z.string().datetime('Deadline must be a valid ISO-8601 date string.'),
  departmentId: z.string().uuid('Invalid department ID.'),
  assignedTo: z.array(z.string().uuid('Invalid employee ID in assignments.')).min(1, 'Task must be assigned to at least one user.'),
  attachments: z.array(z.string().url()).optional(),
  parentTaskId: z.string().uuid().optional().nullable(),
  approvalRequired: z.boolean().default(false)
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().optional().nullable(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  deadline: z.string().datetime().optional(),
  departmentId: z.string().uuid().optional(),
  attachments: z.array(z.string().url()).optional(),
  parentTaskId: z.string().uuid().optional().nullable(),
  approvalRequired: z.boolean().optional()
});

export const taskCommentSchema = z.object({
  comment: z.string().trim().min(1, 'Comment body cannot be blank.')
});
