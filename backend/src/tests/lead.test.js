import { jest } from '@jest/globals';

// Mock Redis connection to prevent open handles and test in isolation
jest.unstable_mockModule('../config/redis.js', () => ({
  __esModule: true,
  default: {
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0)
  }
}));

// Mock responses and response helper to avoid other db/import issues
jest.unstable_mockModule('../utils/response.helper.js', () => ({
  sendError: (res, msg, status) => res.status(status).json({ success: false, message: msg })
}));

const { createLeadSchema, bulkUpdateStatusSchema } = await import('../validators/lead.validator.js');
const { restrictToRoles } = await import('../middleware/auth.middleware.js');

describe('Lead Module Unit Tests', () => {
  describe('Zod Validation Schemas', () => {
    test('should validate correct lead input', () => {
      const result = createLeadSchema.safeParse({
        leadName: 'Test Client',
        phone: '1234567890',
        email: 'client@test.com',
        priority: 'High',
        status: 'New'
      });
      expect(result.success).toBe(true);
    });

    test('should fail when leadName is missing', () => {
      const result = createLeadSchema.safeParse({
        phone: '1234567890'
      });
      expect(result.success).toBe(false);
    });

    test('should validate lead with all new fields successfully', () => {
      const result = createLeadSchema.safeParse({
        leadName: 'New Leads Telecaller Client',
        phone: '9876543210',
        email: 'telecaller.lead@test.com',
        source: 'MARKETING',
        interestedService: 'HOT LEAD',
        clientMeetingFixed: 'Yes',
        admissionYesNo: 'Pending',
        remarks: 'Highly interested student, callback scheduled.',
        leadsReceivedDate: '2026-06-09',
        followUpDate1: '2026-06-10',
        followUpDate2: '2026-06-11',
        followUpDate3: '',
        followUpDate4: null,
        followUpDate5: '2026-06-12'
      });
      expect(result.success).toBe(true);
    });

    test('should validate correct bulk update status input', () => {
      const result = bulkUpdateStatusSchema.safeParse({
        leadIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        status: 'Converted'
      });
      expect(result.success).toBe(true);
    });

    test('should fail bulk update status with empty lead IDs array', () => {
      const result = bulkUpdateStatusSchema.safeParse({
        leadIds: [],
        status: 'Converted'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RBAC Middleware restrictToRoles', () => {
    let mockReq;
    let mockRes;
    let next;

    beforeEach(() => {
      mockReq = { user: {} };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should allow access if user has allowed role name', () => {
      mockReq.user = { role: 'digital_marketer', role_id: '4' };
      const middleware = restrictToRoles(['digital_marketer']);
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should allow access if user has allowed role ID', () => {
      mockReq.user = { role: 'employee', role_id: '4' };
      const middleware = restrictToRoles(['4']);
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should block access if user does not match role requirements', () => {
      mockReq.user = { role: 'employee', role_id: '3' };
      const middleware = restrictToRoles(['digital_marketer', '4']);
      middleware(mockReq, mockRes, next);
      expect(next).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
