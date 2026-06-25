import { Router } from 'express';
import vendorController from '../controllers/vendor.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createVendorSchema, updateVendorSchema } from '../validators/accounting.validator.js';

const router = Router();

// Secure all endpoints with auth check
router.use(checkAuth);

router.get('/', vendorController.getVendors);
router.get('/:id', vendorController.getVendorById);

// Mutations restricted to Admin, HR Manager, and Accountant
router.post('/create', requireRole(['admin', 'hr', 'manager']), validateBody(createVendorSchema), vendorController.createVendor);
router.put('/update/:id', requireRole(['admin', 'hr', 'manager']), validateBody(updateVendorSchema), vendorController.updateVendor);
router.delete('/:id', requireRole(['admin', 'hr', 'manager']), vendorController.deleteVendor);

export default router;
