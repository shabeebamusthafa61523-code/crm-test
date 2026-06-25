import { Router } from 'express';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import {
  createSalarySlip,
  getSalarySlips,
  getSalarySlipById,
  updateSalarySlip,
  publishSalarySlip,
  emailSalarySlip,
  downloadSalarySlipPDF,
  deleteSalarySlip
} from '../controllers/salarySlip.controller.js';

const router = Router();

// Apply authentication check to all routes
router.use(checkAuth);

// GET /api/hr/salary-slips - retrieve slips (filtered and paginated)
router.get('/', getSalarySlips);

// GET /api/hr/salary-slips/:id - retrieve single slip
router.get('/:id', getSalarySlipById);

// GET /api/hr/salary-slips/:id/download-pdf - download PDF format
router.get('/:id/download-pdf', downloadSalarySlipPDF);

// Admin / HR Manager only routes:
router.post('/', requireRole(['admin', 'hr']), createSalarySlip);
router.put('/:id', requireRole(['admin', 'hr']), updateSalarySlip);
router.put('/:id/publish', requireRole(['admin', 'hr']), publishSalarySlip);
router.post('/:id/send-email', requireRole(['admin', 'hr']), emailSalarySlip);
router.delete('/:id', requireRole(['admin', 'hr']), deleteSalarySlip);

export default router;
