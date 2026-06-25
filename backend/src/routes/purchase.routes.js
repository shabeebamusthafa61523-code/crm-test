import { Router } from 'express';
import purchaseController from '../controllers/purchase.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createPurchaseSchema, updatePurchaseSchema } from '../validators/accounting.validator.js';

const router = Router();

router.use(checkAuth);

router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchaseById);

// Mutations restricted to Admin, HR Manager, and Accountant
router.post('/create', requireRole(['admin', 'hr', 'manager', 'accountant']), upload.single('attachment'), (req, res, next) => {
  if (typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (e) {}
  }
  next();
}, validateBody(createPurchaseSchema), purchaseController.createPurchase);

router.put('/update/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), upload.single('attachment'), (req, res, next) => {
  if (typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (e) {}
  }
  next();
}, validateBody(updatePurchaseSchema), purchaseController.updatePurchase);

router.patch('/:id/status', requireRole(['admin', 'hr', 'manager', 'accountant']), purchaseController.updatePurchaseStatus);
router.delete('/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), purchaseController.deletePurchase);

export default router;
