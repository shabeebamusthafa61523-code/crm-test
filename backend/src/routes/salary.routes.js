import { Router } from 'express';
import salaryController from '../controllers/salary.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createSalarySchema, updateSalarySchema, salaryWorkflowSchema } from '../validators/payroll.validator.js';

const router = Router();

router.use(checkAuth);

// Reports - Restricted to Admin/HR Manager
router.get('/reports/monthly', requireRole(['admin', 'hr']), salaryController.getMonthlySalaryReport);

// History - accessible to employee (self) or Admin/HR
router.get('/history', salaryController.getEmployeeSalaryHistory);

router.get('/', salaryController.getSalaries);
router.get('/:id', salaryController.getSalaryById);
router.get('/:id/slip', salaryController.downloadSalarySlip);
router.get('/:id/download', salaryController.downloadSalarySlip);

// Actions - Restricted to Admin/HR Manager
router.post('/create', requireRole(['admin', 'hr']), validateBody(createSalarySchema), salaryController.createSalary);
router.put('/update/:id', requireRole(['admin', 'hr']), validateBody(updateSalarySchema), salaryController.updateSalary);
router.patch('/:id/workflow', requireRole(['admin', 'hr']), validateBody(salaryWorkflowSchema), salaryController.updateSalaryWorkflow);
router.post('/:id/send-slip', requireRole(['admin', 'hr']), salaryController.emailSalarySlip);
router.post('/batch-drafts', requireRole(['admin', 'hr']), salaryController.batchGenerateDrafts);
router.delete('/:id', requireRole(['admin', 'hr']), salaryController.deleteSalary);

export default router;
