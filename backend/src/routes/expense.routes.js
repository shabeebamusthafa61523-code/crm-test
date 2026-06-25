import { Router } from 'express';
import expenseController from '../controllers/expense.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import { validateBody } from '../validators/task.validator.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/accounting.validator.js';

const router = Router();

router.use(checkAuth);

router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpenseById);

// Mutations restricted to Admin, HR Manager, and Accountant
router.post('/create', requireRole(['admin', 'hr', 'manager', 'accountant']), upload.single('attachment'), (req, res, next) => {
  if (req.body.amount) req.body.amount = Number(req.body.amount);
  if (req.body.taxAmount) req.body.taxAmount = Number(req.body.taxAmount);
  next();
}, validateBody(createExpenseSchema), expenseController.createExpense);

router.put('/update/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), upload.single('attachment'), (req, res, next) => {
  if (req.body.amount) req.body.amount = Number(req.body.amount);
  if (req.body.taxAmount) req.body.taxAmount = Number(req.body.taxAmount);
  next();
}, validateBody(updateExpenseSchema), expenseController.updateExpense);

router.patch('/:id/approve', requireRole(['admin', 'hr', 'manager', 'accountant']), expenseController.approveExpense);
router.delete('/:id', requireRole(['admin', 'hr', 'manager', 'accountant']), expenseController.deleteExpense);

export default router;
