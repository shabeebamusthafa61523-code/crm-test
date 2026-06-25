import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/accounting.validator.js';

const router = Router();

router.use(checkAuth);

// Metrics endpoint
router.get('/metrics', invoiceController.getInvoiceMetrics);

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);

// Actions
router.get('/:id/download', invoiceController.downloadInvoicePDF);
router.post('/:id/send-email', invoiceController.sendInvoiceEmail);

// Mutations restricted to Admin, HR Manager, and Accountant
router.post('/create', requireRole(['admin', 'hr', 'manager', 'accountant']), (req, res, next) => {
  if (typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (e) {}
  }
  next();
}, validateBody(createInvoiceSchema), invoiceController.createInvoice);

router.put('/update/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), (req, res, next) => {
  if (typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (e) {}
  }
  next();
}, validateBody(updateInvoiceSchema), invoiceController.updateInvoice);

router.patch('/:id/status', requireRole(['admin', 'hr', 'manager', 'accountant']), invoiceController.updateInvoiceStatus);
router.delete('/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), invoiceController.deleteInvoice);

export default router;
