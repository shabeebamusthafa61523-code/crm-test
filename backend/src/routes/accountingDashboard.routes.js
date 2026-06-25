import { Router } from 'express';
import { getDashboardStats } from '../controllers/accountingDashboard.controller.js';
import checkAuth, { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(checkAuth);

router.get('/stats', requireRole(['admin', 'hr', 'manager']), getDashboardStats);

export default router;
