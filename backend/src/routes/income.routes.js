import { Router } from 'express';
import incomeController from '../controllers/income.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createIncomeSchema, updateIncomeSchema } from '../validators/accounting.validator.js';

const router = Router();

router.use(checkAuth);

router.get('/', incomeController.getIncomes);
router.get('/:id', incomeController.getIncomeById);

// Mutations restricted to Admin, HR Manager, and Accountant
router.post('/create', requireRole(['admin', 'hr', 'manager', 'accountant']), upload.single('attachment'), (req, res, next) => {
  // If req.body.amount is a string, parse it so Zod validates it as a number
  if (req.body.amount) req.body.amount = Number(req.body.amount);
  next();
}, validateBody(createIncomeSchema), incomeController.createIncome);

router.put('/update/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), upload.single('attachment'), (req, res, next) => {
  if (req.body.amount) req.body.amount = Number(req.body.amount);
  next();
}, validateBody(updateIncomeSchema), incomeController.updateIncome);

router.delete('/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), incomeController.deleteIncome);

export default router;
