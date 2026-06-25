import { jest } from '@jest/globals';

// Mock Redis connection
jest.unstable_mockModule('../config/redis.js', () => ({
  __esModule: true,
  default: {
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null)
  }
}));

const { createSalarySchema, salaryWorkflowSchema } = await import('../validators/payroll.validator.js');

describe('Payroll Module Validation Tests', () => {
  describe('Employee Salary Validation', () => {
    test('should validate correct salary worksheet input', () => {
      const result = createSalarySchema.safeParse({
        employeeId: '507f1f77bcf86cd799439011',
        salaryMonth: '2026-06-01',
        basicSalary: 60000,
        hra: 24000,
        travelAllowance: 4000,
        specialAllowance: 5000,
        bonus: 10000,
        pf: 7200,
        professionalTax: 200,
        incomeTax: 5000,
        paymentMethod: 'Bank Transfer'
      });
      expect(result.success).toBe(true);
    });

    test('should fail if basicSalary is negative', () => {
      const result = createSalarySchema.safeParse({
        employeeId: '507f1f77bcf86cd799439011',
        salaryMonth: '2026-06-01',
        basicSalary: -1000
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Salary Workflow Transition Validation', () => {
    test('should pass valid workflow status updates', () => {
      const result = salaryWorkflowSchema.safeParse({
        status: 'Paid',
        paymentMethod: 'Cheque'
      });
      expect(result.success).toBe(true);
    });

    test('should fail invalid workflow status values', () => {
      const result = salaryWorkflowSchema.safeParse({
        status: 'Draft' // Draft is not in workflow schema enum (only Submitted, Approved, Paid, Rejected)
      });
      expect(result.success).toBe(false);
    });
  });
});
