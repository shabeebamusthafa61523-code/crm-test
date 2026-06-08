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

// Apply authentication and department restriction checks globally to all lead endpoints
router.use(checkAuth);
router.use(restrictToDepartment('6a211b6621f80bb8da167efb'));


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
