import { Router } from 'express';
import customerController from '../controllers/customer.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/accounting.validator.js';

const router = Router();

// Secure all endpoints with auth check
router.use(checkAuth);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);

// Mutations restricted to Admin, HR Manager, and Accountant
router.post('/create', requireRole(['admin', 'hr', 'manager']), validateBody(createCustomerSchema), customerController.createCustomer);
router.put('/update/:id', requireRole(['admin', 'hr', 'manager']), validateBody(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', requireRole(['admin', 'hr', 'manager']), customerController.deleteCustomer);

export default router;
