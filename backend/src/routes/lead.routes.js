import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import checkAuth, { restrictToDepartment } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from '../validators/task.validator.js';
import {
  createLeadSchema,
  updateLeadSchema,
  bulkUpdateStatusSchema,
  addFollowUpSchema,
  updateStatusSchema
} from '../validators/lead.validator.js';
import { apiRateLimiter, leadMutationRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Middleware to check authorization for department (Marketing or Telecaller) or role ID 3 (Employee)
const authorizeLeadsAccess = async (req, res, next) => {
  let userDeptId = req.user?.departmentId;
  const userRoleId = String(req.user?.role_id || req.user?.role || '').trim();

  // Fallback: If departmentId is missing from token, query from DB
  if (!userDeptId && req.user?.id) {
    try {
      const User = (await import('../models/user.model.js')).default;
      const userObj = await User.findById(req.user.id);
      if (userObj) {
        userDeptId = userObj.departmentId;
      }
    } catch (err) {
      console.error("Failed to fetch user department fallback:", err);
    }
  }

  userDeptId = String(userDeptId || '').trim();

  // Dynamically resolve department IDs for TLC (Telecaller) and MKT (Marketing)
  let allowedDepartments = [];
  try {
    const Department = (await import('../modules/departments/department.model.js')).default;
    const depts = await Department.find({ code: { $in: ['TLC', 'MKT'] } }).select('_id');
    allowedDepartments = depts.map(d => String(d._id));
  } catch (err) {
    console.error("Failed to query allowed departments dynamically:", err);
  }

  const allowedRoles = ['3', '1', '2', 'hr', 'admin'];

  const hasDeptAccess = allowedDepartments.includes(userDeptId);
  const hasRoleAccess = allowedRoles.includes(userRoleId);

  if (!hasDeptAccess && !hasRoleAccess) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Exclusive to marketing, telecallers, or authorized roles.'
    });
  }

  next();
};

router.use(checkAuth);
router.use(authorizeLeadsAccess);


// GET ALL LEADS (supporting filters, search, and pagination)
router.get('/', apiRateLimiter, leadController.getLeads);

// GET SINGLE LEAD BY ID
router.get('/:id', apiRateLimiter, leadController.getLeadById);

// CREATE LEAD (with Zod validation, rate limiting)
router.post('/create', leadMutationRateLimiter, validateBody(createLeadSchema), leadController.createLead);

// BULK UPDATE LEAD STATUS
router.put('/update', leadMutationRateLimiter, validateBody(bulkUpdateStatusSchema), leadController.bulkUpdateStatus);

// UPDATE SINGLE LEAD
router.put('/:id', leadMutationRateLimiter, validateBody(updateLeadSchema), leadController.updateLead);
router.post('/update/:id', leadMutationRateLimiter, validateBody(updateLeadSchema), leadController.updateLead);
router.post('/update', leadMutationRateLimiter, validateBody(updateLeadSchema), leadController.updateLead);

// LOG FOLLOW-UP ACTION
router.post('/followup', leadMutationRateLimiter, validateBody(addFollowUpSchema), leadController.addFollowUp);
router.post('/followup/:id', leadMutationRateLimiter, validateBody(addFollowUpSchema), leadController.addFollowUp);

// UPDATE LEAD STATUS
router.patch('/status-update', leadMutationRateLimiter, validateBody(updateStatusSchema), leadController.updateStatus);
router.patch('/status-update/:id', leadMutationRateLimiter, validateBody(updateStatusSchema), leadController.updateStatus);
router.post('/status-update', leadMutationRateLimiter, validateBody(updateStatusSchema), leadController.updateStatus);
router.post('/status-update/:id', leadMutationRateLimiter, validateBody(updateStatusSchema), leadController.updateStatus);

// DELETE LEAD (with fallback mappings)
router.delete('/delete/:id', leadMutationRateLimiter, leadController.deleteLead);
router.post('/delete/:id', leadMutationRateLimiter, leadController.deleteLead);
router.delete('/:id', leadMutationRateLimiter, leadController.deleteLead);
router.delete('/delete', leadMutationRateLimiter, leadController.deleteLead);
router.post('/delete', leadMutationRateLimiter, leadController.deleteLead);

// BULK IMPORT LEADS
router.post('/import', leadMutationRateLimiter, leadController.importLeads);

export default router;
