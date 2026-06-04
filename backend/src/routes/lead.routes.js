import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import checkAuth from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all lead endpoints
router.use(checkAuth);

// GET ALL LEADS
router.get('/', leadController.getLeads);

// GET SINGLE LEAD BY ID
router.get('/:id', leadController.getLeadById);

// CREATE LEAD
router.post('/create', leadController.createLead);

// UPDATE LEAD (Supporting POST and PUT formats, and both body / url param IDs)
router.post('/update', leadController.updateLead);
router.post('/update/:id', leadController.updateLead);
router.put('/update/:id', leadController.updateLead);

// ADD FOLLOWUP
router.post('/followup', leadController.addFollowUp);
router.post('/followup/:id', leadController.addFollowUp);

// STATUS UPDATE
router.post('/status-update', leadController.updateStatus);
router.post('/status-update/:id', leadController.updateStatus);

// DELETE LEAD (Supporting DELETE and POST fallback formats)
router.delete('/delete/:id', leadController.deleteLead);
router.post('/delete/:id', leadController.deleteLead);
router.delete('/:id', leadController.deleteLead);
router.delete('/delete', leadController.deleteLead);
router.post('/delete', leadController.deleteLead);

// BULK IMPORT LEADS
router.post('/import', leadController.importLeads);

export default router;
