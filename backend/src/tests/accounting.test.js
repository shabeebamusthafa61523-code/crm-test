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

// Mock Mongoose connection or imports if needed
const { createCustomerSchema, createIncomeSchema, createExpenseSchema } = await import('../validators/accounting.validator.js');

describe('Accounting Module Validation Tests', () => {
  describe('Customer Validation', () => {
    test('should pass correct customer input', () => {
      const result = createCustomerSchema.safeParse({
        name: 'John Doe',
        companyName: 'Acme Corp',
        email: 'john@acme.com',
        phone: '1234567890',
        gstNumber: '29ABCDE1234F1Z5',
        address: 'Bangalore, India'
      });
      expect(result.success).toBe(true);
    });

    test('should fail if name is missing', () => {
      const result = createCustomerSchema.safeParse({
        companyName: 'Acme Corp'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Income Validation', () => {
    test('should validate correct income details', () => {
      const result = createIncomeSchema.safeParse({
        date: '2026-06-23',
        customerId: '507f1f77bcf86cd799439011',
        customerName: 'John Doe',
        invoiceNumber: 'INV-1001',
        paymentMethod: 'Bank Transfer',
        amount: 25000,
        status: 'Active'
      });
      expect(result.success).toBe(true);
    });

    test('should fail if amount is negative', () => {
      const result = createIncomeSchema.safeParse({
        date: '2026-06-23',
        customerId: '507f1f77bcf86cd799439011',
        customerName: 'John Doe',
        invoiceNumber: 'INV-1001',
        paymentMethod: 'Bank Transfer',
        amount: -500
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Expense Validation', () => {
    test('should validate operational expense', () => {
      const result = createExpenseSchema.safeParse({
        expenseType: 'Operational',
        expenseName: 'Office Rent',
        expenseDate: '2026-06-01',
        vendorName: 'Property Owners',
        invoiceNumber: 'RENT-06',
        category: 'Rent',
        amount: 45000,
        taxAmount: 8100,
        paymentMethod: 'Bank Transfer',
        status: 'Pending'
      });
      expect(result.success).toBe(true);
    });
  });
});
