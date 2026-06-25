import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = (fieldName) =>
  z.string().regex(objectIdRegex, { message: `Invalid format for ${fieldName}` });

// --- EMPLOYEE SALARY VALIDATION ---
export const createSalarySchema = z.object({
  employeeId: objectIdSchema('employeeId'),
  salaryMonth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
  basicSalary: z.number().positive('Basic salary must be positive'),
  hra: z.number().min(0).default(0),
  travelAllowance: z.number().min(0).default(0),
  specialAllowance: z.number().min(0).default(0),
  otherAllowance: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  incentive: z.number().min(0).default(0),
  integrityAward: z.number().min(0).default(0),
  advanceSalary: z.number().min(0).default(0),
  pf: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(0),
  incomeTax: z.number().min(0).default(0),
  unpaidLeave: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  workingDays: z.number().min(0).max(31).default(30),
  daysWorked: z.number().min(0).max(31).default(30),
  daysOnLeave: z.number().min(0).max(31).default(0),
  location: z.string().default('Malappuram'),
  paymentMethod: z.enum(['Bank Transfer', 'Cheque', 'Cash']).default('Bank Transfer'),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Paid', 'Rejected']).default('Draft')
});

export const updateSalarySchema = createSalarySchema.partial();

export const salaryWorkflowSchema = z.object({
  status: z.enum(['Submitted', 'Approved', 'Paid', 'Rejected']),
  paymentMethod: z.enum(['Bank Transfer', 'Cheque', 'Cash']).optional(),
  comment: z.string().trim().optional() // For rejections
});
